const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const we = require('./Data/We.json');

require('dotenv').config()
const jwt = require('jsonwebtoken');

const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)

const app=express()
const port=process.env.PORT || 7000;

///middleware
//app.use(cors())
const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
app.use(cors(corsConfig))

app.use(express.json());


app.get('/',(req,res)=>{
    res.send(`Summer Camp school server is running port on ${port}`)
})

////Testing start
// app.get('/we', (req,res)=>{
//     console.log('We All');
//     res.send(we)
// })

// app.get('/we/:id',(req,res)=>{
//     const id=req.params.id;
//     console.log(id);
//     const target_id=we.find(w=>w.id==id)
//     res.send(target_id)
// })
///Testing end


////Verify JWT start
const verifyJWT=(req,res,next)=>{
    const authorization=req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access1'  })
    }

    ///bearer token
    const token=authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err,decoded)=>{
        if(err){
            res.status(403).send({error: true, message: 'unauthorized access2' })
        }

        req.decoded=decoded
        next()
    })
}
////Verify JWT end


////MongoDB work start


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jokwhaf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
   // await client.connect();
    // Send a ping to confirm a successful connection


    /**
     * Operation start
     */

    const userCollection=client.db('camp_school').collection('users')
    const classCollection=client.db('camp_school').collection('classes')
    const cartCollection=client.db('camp_school').collection('cart')
    const paymentCollection=client.db('camp_school').collection('payment')

    ///JWT Start
    app.post('/jwt', (req,res)=>{
        const user=req.body;
        const token= jwt.sign(user,process.env.ACCESS_TOKEN, { expiresIn: '1h' })

        res.send({token})
    })
    ///JWT End

    ///Cart work start
    app.post('/cart', async(req,res)=>{
        const cart=req.body;
        console.log(cart);
        const result= await cartCollection.insertOne(cart)
        res.send(result)
    })


    app.get('/cart', verifyJWT, async(req,res)=>{
        const email=req.query.email;
        console.log('Email: ',email);
        let query={}
        if(email){
            query={useremail: email }
        }

        if(!req?.decoded?.email){
            return res.status(403).send({error: true, message: 'Forbidden Access3' })

        }

       const decodedEmail=req.decoded.email;
       if(email != decodedEmail){
         return res.status(403).send({error: true, message: 'Forbidden Access3' })
       }


        const result=await cartCollection.find(query).toArray()
        res.send(result)
    })

    app.delete('/cart/:id', async(req,res)=>{
        const id=req.params.id;
        console.log(id);
        const query={_id: new ObjectId(id)}
        const result=await cartCollection.deleteOne(query)
        res.send(result)
    })
    ///Cart work end



    ////post user start
    app.post('/user', async(req,res)=>{
        const user=req.body;
        console.log('user: ',user);
       
        const query={email: user.email}
        const existingUser=await userCollection.findOne(query)
        console.log('existing user: ',existingUser);
        if(existingUser){
            return res.send({message: 'user already exists'})
        }

        const result= await userCollection.insertOne(user)
        res.send(result)
    })
    ////post user start


    ///Get User start
    app.get('/user', async(req,res)=>{
        const result=await userCollection.find().toArray()
        res.send(result)
    })
    ///Get User end

    ///Get User specific data start
    app.get('/user/:email', async(req,res)=>{
        const email=req.params.email;
        console.log(email);
        const query={email: email}
        const result= await userCollection.findOne(query)
        res.send(result)
    })
    ///Get User specific data end

     //   update user start
     app.patch('/user/:id', async(req,res)=>{
        console.log('Heat Here');
        const id=req.params.id;
        console.log('ID: ',id);
        const getUserInfo=req.body
        console.log('Update Items: ',getUserInfo);

        const filter={_id: new ObjectId(id)}
        const updatedUser={
            $set:{
                ...getUserInfo
            }
        }
        const result=await userCollection.updateOne(filter,updatedUser)
        res.send(result)
    })
        // update user end

    
        ///check admin start
        app.get('/user/admin/:email',verifyJWT, async (req,res)=>{
            const email= req.params.email;

            if(req.decoded.email!==email){
                res.send({admin: false})
            }


            const query={email: email}
            const user=await userCollection.findOne(query)
            const result={admin: user?.status==='admin' }
            res.send(result)
        })
        ///check admin end

        ///check instructor start
        app.get('/user/instructor/:email',verifyJWT, async (req,res)=>{
            const email= req.params.email;

            if(req.decoded.email!==email){
                res.send({instructor: false})
            }


            const query={email: email}
            const user=await userCollection.findOne(query)
            const result={instructor: user?.status==='instructor' }
            res.send(result)
        })

        ///check instructor end


    // class work start

    // add class start
    app.post('/class', async(req,res)=>{
        const gotClass=req.body;
        console.log(gotClass);
        const result= await classCollection.insertOne(gotClass)
        res.send(result)
    })
    // add class end

    ///Get class start
    app.get('/class', async(req,res)=>{
        const email=req.query.email;
        console.log('email: ',email);

        let query={};
        if(email){
            query={instructoremail: email}
        }

        const result=await classCollection.find(query).sort({enrolledstudents:-1}).toArray()
        res.send(result)
    })
      ///Get class end

    ///Get class by specific id start
    app.get('/class/:id', async(req,res)=>{
        const id=req.params.id;
        console.log('ID: ',id);

        let query={};
        query={_id: new ObjectId(id)}

        const result= await classCollection.findOne(query)
        res.send(result)
    })
      ///Get class by specific id end

    //   update class start
    app.patch('/class/:id', async(req,res)=>{
        console.log('Heat Here');
        const id=req.params.id;
        console.log('ID: ',id);
        const getClassInfo=req.body
        console.log('Update Items: ',getClassInfo);

        const filter={_id: new ObjectId(id)}
        const updatedClass={
            $set:{
                ...getClassInfo
            }
        }
        const result=await classCollection.updateOne(filter,updatedClass)
        res.send(result)
       

    })
     // update class end


     ///check admin start

     ///check admin end
     ///check instructor start
     ///check instructor end


    // class work end


    ///Payment Work start

    //create payment intent
    app.post('/create-payment-intent', async(req,res)=>{
        console.log('Heat Here');
        const {price}=req.body;
        const amount=price*100;
        console.log('Amount: ', amount, 'Price: ',price);

        const paymentIntent=await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types:['card']
    
          });
          res.send({
            clientSecret: paymentIntent.client_secret
          })


    })  
    
    
    ////Payment add to db
    app.post('/payment', async(req,res)=>{
        const payment=req.body;
        console.log('Payment: ',payment);
        const insertResult= await paymentCollection.insertOne(payment)
       

        // const query={_id: {$in: new ObjectId(payment.classid) }}
        const query= {_id: new ObjectId(payment.cart_id)}
        const deleteResult= await cartCollection.deleteOne(query)
        res.send({ insertResult,deleteResult})
    })

    ///get from payment
    app.get('/payment', async(req,res)=>{
        const email=req.query.email
        console.log(email);
        let query={}
        if(email){
            query={email: email}
        }
        const result=await paymentCollection.find(query).sort({date:-1}).toArray()
        res.send(result)
    })

    ///Payment Work end


    /**
     * Operation end
     */
    

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


////MongoDB work end

app.listen(port,()=>{
    console.log(`Summer Camp school server is running port on ${port}`);
})