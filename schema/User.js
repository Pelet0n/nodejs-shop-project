const mongoose = require('mongoose')
const {v4: uuidv4} = require('uuid')

const userSchema = mongoose.Schema({
    Id:{
        type:String,
        required:true,
        default: uuidv4()
    },
    nick:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default: Date.now()
    }

})

module.exports = mongoose.model('users',userSchema)