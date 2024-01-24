const passport = require('passport');

exports.isAuth=(req,res,done)=>{
   return passport.authenticate("jwt");
}

exports.sanitizeUser = (user)=>{
    return {id:user.id, role:user.role}
}

exports.cookieExtractor =function(req){
    let token=null;
    if(req && req.cookies){
      token=req.cookies["jwt"];
      token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YTgxMmUwNjAwMTY3ZDAxNDM1NzIxOCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzA1NTEzNzI5fQ.teoHuy8wYktU9LsIlH-0dG-gVhjB4hac_bkFBkfKRAw"
      return token;
    }
  }