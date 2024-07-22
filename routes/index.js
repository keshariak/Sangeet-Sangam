var express = require('express');
var router = express.Router();
const usermodel= require('../models/userModel')
var songModel = require("../models/songModel")
var playlistModel =require("../models/playlistModel")

var multer= require('multer')
var id3 = require('node-id3')
const {Readable} = require('stream')
var crypto = require('crypto')

// var users= require('../models/userModel')
var passport = require('passport')
var localStrategy = require('passport-local')
passport.use(new localStrategy(usermodel.authenticate()))
const mongoose= require('mongoose')

const conn= mongoose.connection
var gfsBucket, gfsBucketPoster
conn.once('open',()=>{
  gfsBucket= new mongoose.mongo.GridFSBucket(conn.db,{
    bucketName:'audio'
  })
  gfsBucketPoster= new mongoose.mongo.GridFSBucket(conn.db,{
    bucketName:'poster'
  })  
})

// console.log(allSong)




/* GET home page. */
router.get('/',isLoggedIn,async function(req, res, next) {
  // usermodel.findOne({username: req.session.passport.user}).then(function(founduser){
  //   res.render('index', {user: founduser}) 
  // })
  const currentUser= await usermodel.findOne({
    _id :req.user._id
  }).populate('playlist').populate({
    path:'playlist',
    populate:{
      path:'songs',
      model:'song'
    }
  })
  res.render('index', {currentUser}) 

});

router.get('/poster/:posterName',(req,res,next)=>{
  gfsBucketPoster.openDownloadStreamByName(req.params.posterName).pipe(res)
})

router.post('/registerr', async (req, res, next) => {

  const newUser = new usermodel({
    //user data here
     username: req.body.username,
     email:req.body.email,
    //user data here
    });
  usermodel
  .register(newUser, req.body.password)
  .then((result) => {
  passport.authenticate('local')(req, res, async () => {
    const songs= await songModel.find()
    const defaultplaylist= await playlistModel.create({
      name:req.body.username,
      owner:req.user._id,
      songs: songs.map(song=>song._id) 
    })
    // console.log(songs.map(song=>song._id))
    console.log(req.user._id)

    const newUser =await usermodel.findOne({
      _id :req.user._id
    })
    newUser.playlist.push(defaultplaylist._id)
    await newUser.save()
   
    res.redirect('/')
  
  //destination after user register
  // res.redirect('/'); 
  });
  })
  .catch((err) => {
  res.send(err);
  });
  });
  
  
  router.post('/login',passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  }),
  (req, res, next) => {}
  );
  
  router.get('/login', (req, res, next) => {
    res.render('login')
  })
  router.get('/register', (req, res, next) => {
    res.render('register')
  })  
  function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect('/login');
  }

  function isAdmin (req,res,next){
    if(req.user.isAdmin) return next()
    else return res.redirect('/')

  }


  // multer code here
  const storage = multer.memoryStorage()
  const upload = multer({ storage: storage })

  router.post('/uploadMusic', upload.array('song'), async (req,res,next)=>{

    await Promise.all(req.files.map(async file=>{
      const randomName = crypto.randomBytes(20).toString('hex')
      const songData= id3.read(file.buffer)
      Readable.from(file.buffer).pipe(gfsBucket.openUploadStream(randomName))
      Readable.from(songData.image.imageBuffer).pipe(gfsBucketPoster.openUploadStream(randomName+ 'poster'))
      
      await songModel.create({
        title:songData.title,
        artist:songData.artist,
        album:songData.album,
        size:file.size,
        poster: randomName+ 'poster',
        fileName:randomName
      
      })
    }))
  
    res.send('Song Uploaded')

  })

  router.get('/stream/:musicName', async (req,res,next)=>{
    const currentSong= await songModel.findOne({
      fileName:req.params.musicName
    })
    console.log(currentSong)
    
   const stream= gfsBucket.openDownloadStreamByName(req.params.musicName)
   res.set('Contect-Type', 'audio/mpeg')
   res.set('Content-Length', currentSong.size)
   res.set('Content-Range', `bytes 0 - ${currentSong.size - 1}/${currentSong.size}`)
   res.set('Content-Ranges', 'bytes')
   res.status(206)
   stream.pipe(res)
  })


  //searching code
  router.get('/search', (req,res)=>{
    res.render('search')

  })
  // router.post('/search',async (req,res)=>{
  //  const searchedMusic= await songModel.find({
  //   title :{$regex: req.body.search}
  //  })
  //  res.json({
  //   songs:searchedMusic
  //  })

  // })

  router.post('/',async (req,res)=>{
    // console.log( req.body.search)
     const searchedMusic= await songModel.find({
      title :{$regex: req.body.search}
     })
    //  console.log(searchedMusic)
     res.json({
      songs:searchedMusic
     })
  
    })

  

module.exports = router;
