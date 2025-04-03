const { check, validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    pageTitle: "Login",
    currentPage: "login",
    isLoggedIn: false,
    errors: [],
    oldInput: { email: "" },
    user: {},
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    pageTitle: "Signup",
    currentPage: "signup",
    isLoggedIn: false,
    errors: [],
    oldInput: { firstName: "", lastName: "", email: "", userType: "" },
    user: {},
  });
};

exports.postSignup = [
  check("firstName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("First Name should be at least 2 characters long")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First Name should contain only alphabets"),

  check("lastName")
    .optional()
    .matches(/^[A-Za-z\s]*$/)
    .withMessage("Last Name should contain only alphabets"),

  check("email")
    .optional()
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  check("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password should be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)
    .withMessage("Password should contain at least one letter and one number")
    .trim(),

  check("confirmPassword")
    .optional()
    .trim()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("userType")
    .optional()
    .isIn(["guest", "host"])
    .withMessage("Invalid user type"),

  check("terms")
    .optional()
    .custom((value, { req }) => {
      if (value && value !== "on") {
        throw new Error("Please accept the terms and conditions");
      }
      return true;
    }),

  (req, res, next) => {
    const { firstName, lastName, email, password, userType } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("auth/signup", {
        pageTitle: "Signup",
        currentPage: "signup",
        isLoggedIn: false,
        errors: errors.array().map((err) => err.msg),
        oldInput: { firstName, lastName, email, password, userType },
        user: {},
      });
    }

    if (password) {
      bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            userType,
          });
          return user.save();
        })
        .then(() => {
          res.redirect("/auth/login");
        })
        .catch((err) => {
          return res.status(422).render("auth/signup", {
            pageTitle: "Signup",
            currentPage: "signup",
            isLoggedIn: false,
            errors: [err.message],
            oldInput: { firstName, lastName, email, userType },
            user: {},
          });
        });
    } else {
      const user = new User({ firstName, lastName, email, userType });
      user
        .save()
        .then(() => {
          res.redirect("/auth/login");
        })
        .catch((err) => {
          return res.status(422).render("auth/signup", {
            pageTitle: "Signup",
            currentPage: "signup",
            isLoggedIn: false,
            errors: [err.message],
            oldInput: { firstName, lastName, email, userType },
            user: {},
          });
        });
    }
  },
];

exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      currentPage: "login",
      isLoggedIn: false,
      errors: ["User does not exist"],
      oldInput: { email },
      user: {},
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      currentPage: "login",
      isLoggedIn: false,
      errors: ["Invalid Password"],
      oldInput: { email },
      user: {},
    });
  }

  req.session.isLoggedIn = true;
  req.session.user = user;
  await req.session.save();

  res.redirect("/");
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};
