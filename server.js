const { log } = require("console");
const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);
//file imports
const { userDataValidate, isEmailValidate } = require("./utills/authUtill");
const userModel = require("./models/userModel");
const isAuth = require("./middlewares/isAuthMiddleware");
const todoDataValidation = require("./utills/todoUtills");
const todoModel = require("./models/todoModel");

//constant
const app = express();
const PORT = process.env.PORT;
const store = new mongodbSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

//db connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("mongodb connected successfully"))
  .catch((err) => console.log(err));

//midddleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);
//APIs

app.get("/register", (req, res) => {
  return res.render("registerPage");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  const { name, email, username, password } = req.body;
  try {
    await userDataValidate({ name, email, username, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  try {
    const userEmailExist = await userModel.findOne({ email });

    if (userEmailExist) {
      return res.status(400).json("User's email alredy exist");
    }

    const userUsernameExist = await userModel.findOne({ username });

    if (userUsernameExist) {
      return res.status(400).json("User's username alredy exist");
    }
    //hashing password
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT)
    );
    console.log(hashedPassword);

    const userObj = new userModel({
      name: name,
      email: email,
      username: username,
      password: hashedPassword,
    });

    const userDb = await userObj.save();
    res.redirect("/login");
    // return res.status(201).json({
    //     message:"register successfully",
    //     data:userDb,
    // })
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});

app.get("/login", (req, res) => {
  return res.render("loginPage");
});

app.post("/login", async (req, res) => {
  console.log(req.body);
  const { loginId, password } = req.body;
  if (!loginId || !password)
    return res.status(400).json("User's credentials are missing");
  try {
    let userdb;
    if (isEmailValidate({ key: loginId })) {
      userdb = await userModel.findOne({ email: loginId });
    } else {
      userdb = await userModel.findOne({ username: loginId });
    }
    console.log(userdb);
    if (!userdb)
      return res.status(400).json("user not founded please register first");

    const isMatch = await bcrypt.compare(password, userdb.password);
    if (!isMatch) return res.status(400).json("Incorrect password");

    req.session.isAuth = true;
    req.session.user = {
      userId: userdb._id,
      username: userdb.username,
      email: userdb.email,
    };

    res.redirect("/dashboard");
    //return res.status(200).json("login successfull")
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  res.render("dashboardPage");
});

app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(400).json("logout unsuccessfull");

    return res.redirect("/login");
  });
});

app.post("/logout-out-from-all", isAuth, async (req, res) => {
  const username = req.session.user.username;
  //create a schema
  const sessonSchema = new mongoose.Schema({ _id: String }, { strict: false });
  //create model
  const sessionModel = mongoose.model("session", sessonSchema);
  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    console.log(deleteDb);
    return res.redirect("/login");
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.post("/create-item", isAuth, async (req, res) => {
  const username = req.session.user.username;

  const todo = req.body.todo;

  try {
    await todoDataValidation({ todo });
  } catch (error) {
    return res.send({
      status: 400,
      error: error,
    });
  }
  const todoObj = new todoModel({
    todo,
    username,
  });
  try {
    const todoDb = await todoObj.save();
    return res.send({
      status: 201,
      message: "todo created successfull",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.get("/read-item", isAuth, async (req, res) => {
  const username = req.session.user.username;
  try {
    const todoDb = await todoModel.find({ username: username });
    return res.send({
      status: 200,
      message: "read-item successfull",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.post("/edit-item", isAuth, async (req, res) => {
  const { todoId, newData } = req.body;
  const username=req.session.user.username;
  
  try {
    await todoDataValidation({ todo: newData });
  } catch (error) {
    return res.send({
      status: 400,
      error: error,
    });
  }

  try {
    const todoDb = await todoModel.findOne({ _id: todoId });
    if (username !== todoDb.username)
      return res.send({
        status: 403,
        message: "user not allow to edit some one else todo",
      });
    const todoDbNew = await todoModel.findOneAndUpdate(
      { _id: todoId },
      { todo: newData },
      { new: true }
    );
    return res.send({
      status: 200,
      message: "updata todo successfull",
      data: todoDbNew,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
