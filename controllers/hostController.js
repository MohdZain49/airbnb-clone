const Home = require("../models/home");
const User = require("../models/user");
const fs = require("fs");

exports.getAddHome = (req, res, next) => {
  res.render("host/edit-home", {
    pageTitle: "Add Home to airbnb",
    currentPage: "addHome",
    editing: false,
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
  });
};

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";

  Home.findById(homeId).then((home) => {
    if (!home) {
      console.log("Home not found for editing.");
      return res.redirect("/host/host-homes-list");
    }

    console.log(homeId, editing, home);
    res.render("host/edit-home", {
      home: home,
      pageTitle: "Edit your Home",
      currentPage: "host-homes",
      editing: editing,
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  });
};

exports.getHostHomes = async (req, res, next) => {
  const userId = req.session.user._id;
  const user = await User.findById(userId).populate("hostedHomes");
  console.log("this log comes from getHostHomes", user);
  res.render("host/host-home-list", {
    registeredHomes: user.hostedHomes,
    pageTitle: "Host Homes List",
    currentPage: "host-homes",
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
  });

  // Home.find().then((registeredHomes) => {
  //   res.render("host/host-home-list", {
  //     registeredHomes: registeredHomes,
  //     pageTitle: "Host Homes List",
  //     currentPage: "host-homes",
  //     isLoggedIn: req.isLoggedIn,
  //     user: req.session.user,
  //   });
  // });
};

exports.postAddHome = async (req, res, next) => {
  const { houseName, price, location, rating, description } = req.body;

  if (!req.file) {
    return res.status(422).send("No image provided");
  }

  const photo = req.file.path;

  const home = new Home({
    houseName,
    price,
    location,
    rating,
    photo,
    description,
  });
  home.save().then(() => {
    console.log("Home Saved successfully");
  });

  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (!user.hostedHomes.includes(home._id)) {
    user.hostedHomes.push(home._id);
    await user.save();
  }

  res.redirect("/host/host-homes-list");
};

exports.postEditHome = (req, res, next) => {
  const { id, houseName, price, location, rating, description } = req.body;
  Home.findById(id)
    .then((home) => {
      home.houseName = houseName;
      home.price = price;
      home.location = location;
      home.rating = rating;
      home.description = description;

      if (req.file) {
        fs.unlink(home.photo, (err) => {
          if (err) {
            console.log("Error while deleting file ", err);
          }
        });
        home.photo = req.file.path;
      }

      home
        .save()
        .then((result) => {
          console.log("Home updated ", result);
        })
        .catch((err) => {
          console.log("Error while updating ", err);
        });
      res.redirect("/host/host-homes-list");
    })
    .catch((err) => {
      console.log("Error while finding home ", err);
    });
};

exports.postDeleteHome = (req, res, next) => {
  const homeId = req.params.homeId;
  console.log("Came to delete ", homeId);
  Home.findByIdAndDelete(homeId)
    .then(() => {
      res.redirect("/host/host-homes-list");
    })
    .catch((error) => {
      console.log("Error while deleting ", error);
    });

  const userId = req.session.user._id;
  User.findById(userId)
    .then((user) => {
      user.hostedHomes = user.hostedHomes.filter((home) => home != homeId);
      return user.save();
    })
    .then(() => {
      console.log("User updated after deleting home");
    })
    .catch((error) => {
      console.log("Error while updating user ", error);
    });
};
