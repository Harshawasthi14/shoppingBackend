require("dotenv").config()
const express= require("express");
const app= express();
const mongoose=require("mongoose");
const cors=require("cors");
const session =require("express-session");
const passport=require("passport");
const LocalStrategy=require("passport-local").Strategy;
const crypto=require("crypto")
const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const cookieParser= require("cookie-parser");
const productsRouter =require("./routes/Product");
const brandsRouter =require("./routes/Brand");
const categoriesRouter =require("./routes/Category");
const usersRouter =require("./routes/User");
const authRouter =require("./routes/Auth");
const cartRouter =require("./routes/Cart");
const ordersRouter =require("./routes/Order");
const { User } = require("./model/User");
const { sanitizeUser, isAuth, cookieExtractor } = require("./services/common");
const helmet= require("helmet")
const path=require("path");
const { Order } = require("./model/Order");


const endpointSecret = process.env.ENDPOINT_SECRET;




  

app.post('/webhook', express.raw({type: 'application/json'}), async(request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      const order= await Order.findById(paymentIntentSucceeded.metadata.orderId)
      order.paymentStatus= "received";
      await order.save();
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

const opts = {};
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY; // TODO: should not be in code;

app.use(express.static(path.resolve(__dirname,"build")));
app.use(cookieParser());


app.use(
    session({
      secret: process.env.SESSION_KEY,
      resave: false, // don't save session if unmodified
      saveUninitialized: false, // don't create session until something stored
    })
  );

  app.use(passport.authenticate('session'));
  app.use(
    cors({
      exposedHeaders: ['X-Total-Count'],
    })
  );

 

app.use(express.json());
// app.use(cors({
//     exposedHeaders:["X-Total-Count"]
// }));
app.use("/products",isAuth(),productsRouter.router)
app.use("/brands",isAuth(),brandsRouter.router)
app.use("/categories",isAuth(),categoriesRouter.router)
app.use("/users",isAuth(),usersRouter.router)
app.use("/auth",authRouter.router)
app.use("/cart",isAuth(),cartRouter.router)
app.use("/orders",isAuth(),ordersRouter.router)



passport.use(
    'local',
    new LocalStrategy({usernameField:"email"},async function (email, password, done) {
      
      try {
        const user = await User.findOne({email:email}).exec();
        if (!user) {
            done(null, false, {message:"invalid credentials"});
          } 
        crypto.pbkdf2(
            password,
            user.salt,
            310000,
            32,
            'sha256',
            async function (err, hashedPassword) {
              if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
               return done(null, false, {message:"invalid credentials"});
                } 
                    const token = jwt.sign(sanitizeUser(user), process.env.JWT_SECRET_KEY);
                    done(null ,{id:user.id, role:user.role,token});
            })
        console.log({user})
    
      } catch (err) {
        done(err);
        console.log(err);
        // res.status(400).json(err);
      }
    })
  );

  passport.use(
    'jwt',
    new JwtStrategy(opts, async function (jwt_payload, done) {
      console.log({ jwt_payload });
      try {
        const user = await User.findById(jwt_payload.id);
        if (user) {
          return done(null, sanitizeUser(user)); // this calls serializer
        } else {
          return done(null, false);
        }
      } catch (err) {
        return done(err, false);
      }
    })
  );

  passport.serializeUser(function (user, cb) {
    console.log('serialize', user);
    process.nextTick(function () {
      return cb(null, {id:user.id, role:user.role});
    });
  });
  
  // this changes session variable req.user when called from authorized request
  
  passport.deserializeUser(function (user, cb) {
    console.log('de-serialize', user);
    process.nextTick(function () {
      return cb(null, user);
    });
  });



const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);

// const customer = await stripe.customers.create({
//   name: 'Jenny Rosen',
//   address: {
//     line1: '510 Townsend St',
//     postal_code: '98140',
//     city: 'San Francisco',
//     state: 'CA',
//     country: 'US',
//   },
// });



app.post("/create-payment-intent", async (req, res) => {
  const { totalAmount,orderId } = req.body;
   
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    description:"Software development services",
    shipping:{
      name:"Jenny Rosen",
      address: {
        line1: '510 Townsend St',
        postal_code: '98140',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      },
    },
    amount: totalAmount*100,
    currency: "INR",
    payment_method: 'pm_card_visa',
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
    metadata:{
      orderId
    }
    
    
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});


//database connection
main().catch(err=> console.log("database not connected"))
async function main(){
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("database connected")
}


app.get("/",(req,res)=>{
    res.json({status:"success"});
})





app.listen(process.env.PORT,()=>{
    console.log("server started ")
})

//whsec_a2cb8a594d8671a13aa7a711b302edf0935c4f835d6ba0eb9915c53137011c7f