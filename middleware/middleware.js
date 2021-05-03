const jwt = require('jsonwebtoken')

module.exports = {
    isNotAuth: function(req,res,next){
        if(req.isAuthenticated()){
            return next()
        }
        else{
            res.redirect('/')
        }
    },
    isAuth: function(req,res,next){
        if(req.isAuthenticated()){
            res.redirect('/mainPage')
        }
        else{
            return next()
        }
    }

    
}