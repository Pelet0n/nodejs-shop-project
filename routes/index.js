const express = require('express')
const router = express.Router()
const User = require('../schema/User')
const bcrypt = require('bcryptjs')
const {isAuth, isNotAuth} = require('../middleware/middleware')
const passport = require('passport')
const { request } = require('express')
const validator = require('validator')
const { session } = require('passport')
const Ogloszenie = require('../schema/Ogloszenia')
const Ogloszenia = require('../schema/Ogloszenia')
const path = require('path')
const gridFs = require('multer-gridfs-storage')
const stripe = require('stripe')('sk_test_51I5qjZLLbWkK6zLyrtKJqJoD2EsWVp24s9xJUSHkMsiR3BBr6yKh2Ppku0lhIW9baVxcBeFlOVlLl9OnJv9m8Isr00bykOjGnh')

const multer = require('multer')
const { default: Stripe } = require('stripe')

const diskStorage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,'public/photos')
    },
    filename: function(req,file,cb){
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const fileFilter = function(req,file,cb){
    if(file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || typeof file.mimetype == 'undefined'){
        cb(null,true)
    }
    else{
        cb(null,false)
    }
}

const upload = multer({dest:'public/',storage:diskStorage, fileFilter:fileFilter})

router.use(express.json())

router.post('/register',async (req,res)=>{

    const {nick, password,password2,email,check} = req.body
    
    if(validator.isEmpty(nick)||validator.isEmpty(password)||validator.isEmpty(password2)||validator.isEmpty(email)){
        req.flash('error_reg','Proszę uzupełnić wszystkie pola')
        return res.redirect('/')
    }


    if(!validator.isLength(nick,{min:5,max:15})){
        req.flash('error_reg','Nazwa użytkownika powinna mieć conajmniej 5 znaków i maksymalnie 15 znaków')
        return res.redirect('/')
    }

    if(!validator.isStrongPassword(password)){
        req.flash('error_reg','Hasło jest za słabe')
        return res.redirect('/')
    }

    if(!validator.equals(password,password2)){
        req.flash('error_reg','Hasła nie są takie same')
        return res.redirect('/')
    }
    

    if(!validator.isEmail(email)){
        req.flash('error_reg','Nieprawidłowy adres e-mail')
        return res.redirect('/')
    }

    
    if(check === undefined){
        req.flash('error_reg','Regulamin nie został zaakceptowany')
        return res.redirect('/')
    }

    const usedNick = await User.findOne({nick: nick})
    if(usedNick){
        req.flash('error_reg','Istnieje użytkownik z taką nazwa!')
        return res.redirect('/')      
    }
    const usedEmail = await User.findOne({email: email})
    if(usedEmail){
        req.flash('error_reg','Istnieje już taki adres e-mail')
        return res.redirect('/')
    }

    const newUser = new User({
            nick,
            password,
            email
        }) 

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(newUser.password,salt,async (err,hash)=>{
            newUser.password = hash
            try {
                await newUser.save()
                req.flash('success','Udało się zarejestrować')
                res.redirect('/')
            } catch (err) {
                console.log(err)
            }
        })
    })

})



router.post('/login',passport.authenticate('local',{failureRedirect: '/',failureFlash:true}),(req,res)=>{
    res.redirect('/mainPage')
})


router.get('/mainPage',isNotAuth,async (req,res)=>{
    
    const ogloszenia = await Ogloszenie.find({}).populate('user').lean()
    
    res.render('mainPage',{
        name: req.user.nick,
        ogloszenia,
      
    })
})
router.get('/',isAuth,(req,res)=>{
    res.render('login',{
        error_log: req.flash('error_log'),
        error_reg: req.flash('error_reg'),
        success: req.flash('success')
    })
})

router.get('/konto',isNotAuth,async(req,res)=>{
    const user = await User.findById(req.user._id).lean()
    res.render('accountPage',{
        user
    })
})

router.get('/add',isNotAuth,async(req,res)=>{
    res.render('add',{
        errFile: req.flash('errFile')
    })
})

router.post('/adding',isNotAuth,upload.single('zdjecie'),async(req,res)=>{
    if(req.file === undefined){
        req.flash('errFile','Obsługiwane typy plików to jpg/jpeg')
        return res.redirect('/add')
    } 
    const dane = {
        nazwa: req.body.nazwa,
        cena: req.body.cena,
        opis: req.body.opis,
        zdjecie: req.file.filename
    }

    const newAd = new Ogloszenie({
        uzytkownik: req.user.nick,
        produkt: dane.nazwa,
        cena: dane.cena,
        opis: dane.opis,
        zdjecie: dane.zdjecie
    })

    newAd.save()

    res.redirect('/mainPage')
})

router.get('/ogloszenie/:_id',isNotAuth, async (req,res)=>{
    const ogloszenie = await Ogloszenia.findById(req.params._id)
    if(ogloszenie){
        res.render('ogloszenie',{
            ogloszenie
        })
      
    }
    else{
        console.log('Ogłoszenie albo znikło albo jest nieprawidłowe')
        return res.redirect('/mainPage')
    }
})

router.get('/ogloszenie/edit/:id',isNotAuth,async(req,res)=>{
    const ogloszenie = await Ogloszenia.findById(req.params.id)
    res.render('edit',{
        ogloszenie
    })
})

router.put('/ogloszenie/edit/:id',isNotAuth,async(req,res)=>{
    let ogloszenie = await Ogloszenia.findById(req.params.id)
    if(ogloszenie){
        ogloszenie = await Ogloszenia.findOneAndUpdate({_id: req.params.id},req.body,{
            runValidators: true,
            new: true
        })
    }
    res.redirect('/mainPage')
})

router.get('/mojeOgloszenia',isNotAuth,async(req,res)=>{
    try {
        const ogloszenie = await Ogloszenia.find({uzytkownik: req.user.nick})
        res.render('mojeOgloszenia',{
            ogloszenie,
            name: req.user.nick
        })
    } catch (error) {
        console.log(error)
    }
    
})

router.post('/payment/:id',isNotAuth,async(req,res)=>{
    const ogloszenie = await Ogloszenia.findById(req.params.id)

    const amount = ogloszenie.cena * 100
    try {
        await stripe.customers.create({
            email: req.body.stripeEmail,
            source: req.body.stripeToken
        }).then(customer => stripe.charges.create({
            amount,
            description: 'Test Test',
            currency: 'pln',
            customer: customer.id
        })).then(charge => res.redirect('/mainPage'))

    } catch (err) {
        console.log(err)
    }
})

router.get('/logout',isNotAuth,(req,res)=>{
    req.logout()
    res.redirect('/')
})

module.exports = router