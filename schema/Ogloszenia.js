const mongoose = require('mongoose')

const adSchema = mongoose.Schema({
    uzytkownik:{
        required: true,
        type:String
    },
    produkt:{
        required: true,
        type:String
    },
    cena:{
        required:true,
        type:Number
    },
    opis:{
        required:true,
        type:String
    },
    zdjecie:{
        type:String
    }
})

module.exports = mongoose.model('ogloszenie',adSchema)