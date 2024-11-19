// authMiddleware.js
module.exports = (req, res, next) => {
    if (req.session.userId) {
      next(); // User is authenticated
    } else {
      res.redirect('/login');
    }
  };
  