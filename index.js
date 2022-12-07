const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(express.json())
app.use(express.urlencoded({ extended: false}))

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const exerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: new Date()
  }
})

const userSchema = new mongoose.Schema({
  username: {
  type: String,
  required: true
  },
  exercises: [exerciseSchema]
})

const User = mongoose.model("User", userSchema)

const createAndSaveUser = async (user) => {
  const newUser = new User({
    ...user
  });

  await newUser.save();
  return newUser
};

const getAllUsers = async () => {
  return await User.find().select("username").exec()
};

const getLogsFromUser = async (userId, filter) => {
  return await User.findById(userId)
}

const addExerciseInUserById = async (userId, exercise) => {
  const result =  await User.findById(userId)
  result.exercises.push(exercise)
  const updateUser = await result.save()

  return {username: updateUser.username, ...exercise, date: (new Date(exercise.date)).toDateString(), duration: +exercise.duration }
}

app.route('/api/users').post( async (req, res) => {
  try {
    const userDTO = await createAndSaveUser({...req.body})
    res.json({username:userDTO.username, _id: userDTO._id})
  } catch (error) {
    console.log(error)
    res.json({error: error.message})
  }
}).get(async (_req, res) => {
  try {
    res.json(await getAllUsers())
  } catch (error) {
    console.log(error)
    res.json({error: error.message})
  }
})

app.route('/api/users/:id/exercises').post( async (req, res) => {
  try {
    const userId = req.params.id
    const responseDTO = await addExerciseInUserById(userId, {...req.body})
    return res.json(responseDTO)
  } catch (error) {
    console.log(error)
    res.json({error: error.message})
  }
})

app.route('/api/users/:id/logs').get( async (req, res) => {
  try {
    const userId = req.params.id
    const filter = req.query
    const userLogs = await getLogsFromUser(userId)
    let logs = [...userLogs.exercises]

    if(filter.from) {
      logs = logs.filter(log => log.date >= new Date(filter.from))
    }
    if(filter.to) {
      logs = logs.filter(log => log.date <= new Date(filter.to))
    }
    if(filter.limit) {
      logs.splice(filter.limit)
    }

    const logsDTO = logs.map(log => {
      return{
      description: log.description,
      duration: log.duration,
      date: (new Date(log.date)).toDateString(),
    }
  })
    const userLogsDTO = {
      username: userLogs.username,
      count: logs.length,
      _id: userLogs._id,
      log: logsDTO
    }

    res.json(userLogsDTO)
  } catch (error) {
    console.log(error)
    res.json({ error: error})
  }
})

