const mongoose = require('mongoose')
var plm = require('passport-local-mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/sangeetSangam");
const userSchema = mongoose.Schema({
    username:{
        type:String,
        required: [ true, "username is required for creating a user" ],
        unique: [ true, "username field must be unique" ],
      },
      playlist:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"playlist"

      }],
      liked:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"song"
      }],
      isAdmin:{
        type:Boolean,
        default:false
      },
    email:String,
    password:String, 
})

userSchema.plugin(plm)
module.exports = mongoose.model('user', userSchema)