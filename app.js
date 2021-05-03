const express = require('express')
const bodyParser = require('body-parser')
const expressLayouts = require('express-ejs-layouts')
const passport = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')
const methodOverride = require('method-override')
const MongoStore = require('connect-mongo')(session)
const path = require('path')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./schema/User')
const cors = require('cors')
const flash = require('connect-flash')


require('dotenv').config()

const app = express()

app.set('view engine','ejs')
app.use(expressLayouts)

//bodyparser
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname,"public")))

app.use(cors())

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  }))

app.use(flash())

app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method
      delete req.body._method
      return method
    }
  }))


app.use(passport.initialize())
app.use(passport.session())
app.use('/',require('./routes/index'))

//MongoDB
async function connectMongo(){
    try {
        await mongoose.connect(process.env.MONGO_URI,{
            useNewUrlParser:true,
            useUnifiedTopology:true,
            useFindAndModify:false
        })
        console.log('MongoDB connected!')
    } catch (err) {
        console.log(err)
    }
    
}

connectMongo()



//passport 



passport.use(new LocalStrategy({usernameField:'nick',passReqToCallback:true},async (req,username,password,done)=>{
    const user = await User.findOne({nick: username})
         if(!user){
             return done(null,false,req.flash('error_log','Nieprawidłowa nazwa użytkownika lub niepoprawne hasło!'))
         }
         
             bcrypt.compare(password,user.password,(err,result)=>{
                 if(err){
                     console.log(err)
                     return done(null,false)
                 }
                 if(result){
                     return done(null,user)
                 }
                 else{
                     return done(null,false,req.flash('error_log','Nieprawidłowa nazwa użytkownika lub niepoprawne hasło!'))
                 }
             })
         
     })
)
passport.serializeUser(function(user, done) {
    done(null, user._id);
  })

passport.deserializeUser(function(_id, done) {
    User.findById(_id, function(err, user) {
      done(err, user)
    })
  })




//Utwórz serwer
const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
    console.log(`Server running at port ${PORT}`)
})