var fs = require("fs-extra");
var Sync = require("sync");
var localPath = require("helper").localPath;
var model = require("./model");
var async = require("async");

// Start listening for all blogs with this client
model.list(function(err, blogIDs) {
  if (err) throw err;
  blogIDs.forEach(function(blogID) {
    model.get(blogID, function(err, folder) {
      if (err) throw err;
      init(blogID, folder, function(err) {
        if (err) throw err;
      });
    });
  });
});

// I know I should use a proper library but this is just
// for illustrative purposes.
function walk(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + "/" + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

function init(blogID, userFolder, callback) {
  fs.watch(userFolder, { recursive: true }, function(event, path) {
    if (!path) return;

    // Blot likes leading slashes
    path = "/" + path;

    var syncOptions = { retryCount: -1, retryDelay: 10, retryJitter: 10 };
    var affectedPaths = [path];
    var pathInUserFolder = userFolder + path;
    var pathOnBlot = localPath(blogID, path);

    Sync(blogID, syncOptions, function(err, folder, done) {
      if (err) return console.log(err);

      fs.stat(pathInUserFolder, function(err, stat) {
        try {
          affectedPaths = affectedPaths.concat(
            walk(pathOnBlot).map(function(path) {
              return path.slice(folder.path.length);
            })
          );
        } catch (e) {}

        try {
          affectedPaths = affectedPaths.concat(
            walk(pathInUserFolder).map(function(path) {
              return path.slice(userFolder.length);
            })
          );
        } catch (e) {}

        if (stat) {
          fs.copySync(pathInUserFolder, pathOnBlot);
        } else {
          fs.removeSync(pathOnBlot);
        }

        async.each(affectedPaths, folder.update, function(err) {
          if (err) console.log(err);
          done(null, function(err) {
            if (err) console.log(err);
          });
        });
      });
    });
  });

  callback(null);
}

module.exports = init;
