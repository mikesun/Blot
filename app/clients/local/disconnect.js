module.exports = function disconnect(blogID, callback) {
  require("./model").unset(blogID, function(err) {
    if (err) return callback(err);
    // eventually clients should not need to do this
    require("blog").set(blogID, { client: "" }, callback);
  });
};
