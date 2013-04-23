(function() {
  "use strict";

  var _git = require("gift");
  var _repo = null;
  var _valid_repo = false;

  //
  //===== Initialize git repository =====
  //
  exports.init = function(path) {
    if (path) {
      _repo = _git(path);

    } else {
      _repo = _git(".");

    }

    _repo.status(function(err, status) {
      if (err) {
        // Init failed, indicate error
        console.log("Git repo initialization failed: " + err);
        _valid_repo = false;
        return false;

      } else {
        // Init successful, sets flag
        console.log("Git repo initialization successful!");
        _valid_repo = true;
        return true;
      }
    })
  };


  //
  //===== Show repo status (clean? tracked/untracked files?)
  //
  exports.showStatus = function() {
    if (!_valid_repo) {
      // Did not properly init yet, return error
      return false;
    }

    _repo.status(function(err, status) {
      if (err) 
      console.log(status);
      console.log(err);
    })
  }


  //
  //===== Document version control
  // Overview:
  //  List edit history of selected file
  //  List edit history of whole repo
  //  Save file (add and commit edit)
  //  Publish selected files
  //  Publish everything
  //  Remove file (remove and commit)
  //  Revert file to previous edit history (checkout file and commit, can retrive removed files)
  //

  /*
    Lists the history of a certain file
    - filename: name of the file being queried
    - limit: an integer indicating how many commits to be shown, put "all" if want to see all commits
    TODO: add callback
  */
  exports.showFileHistory = function(filename, limit) {
    _repo.file_history(filename, limit, function(err, commits) {
      console.log(commits);
    });
  }

  /*
    Lists most recent commits applied to the whole repo (branch is default to "master")
    - limit: how many commits to return
    - skip(optional): how many commits to skip (for pagination)
  */
  exports.showHistory = function(limit, skip) {
    _repo.commits("master", limit, skip, function(err, commits) {
      if (err) {
        console.log(err);

      } else {
        console.log(commits);
      }
    });
  }

  /*
    Add the file to be saved into current commit and commit the file
    - filename: name of the file to be saved
    - msg: a message associated to the save action
  */
  exports.saveFile = function(filename, msg) {
    _repo.add(filename, function(err) {
      if (err) {
        console.log(err);
        return;
      }

      _repo.commit(msg, {}, function(err) {
        if (err) {
          console.log(err);
          return;
        }
      });
    });
  }

  /*
    Remove a file from file system, then commit the removal
    - filename: name of the file to be removed
    - NOTE: File removed by this command can be retrived back by using revertFile
  */
  exports.removeFile = function(filename) {
    _repo.remove(filename, function(err) {
      if (err) {
        console.log(err);
        return;
      }

      _repo.commit('Removed file "' + filename + '"', {}, function(err) {
        if (err) {
          console.log(err);
          return;
        }
      })
    });
  }

  /*
    Revert a file back to a previous commited state, and then commit the revert
    - commitID: ID of the commit to revert to
    - filename: name of the file to be reverted
  */
  exports.revertFile = function(commitID, filename) {
    _repo.checkoutFile(commitID, filename, function(err) {
      if (err) {
        console.log(err);
        return;
      }

      exports.saveFile(filename, 'Reverted file "' + filename + '" to previous version from snapshot ID: ' + commitID);
    });
  }

  /*
    Publish selected file(s) (pushes selective file(s) from local repo to remote repo)
    - files: list of names of the files to be published
  */
  exports.publishFiles = function(files) {
    var fileCommits = [];
    // Get all the commit ids needing to be cherry-picked
    for (var i=0; i<files.length; i++) {
      _repo.file_history(files[i], 1, function(err, commits) {
        if (err) {
          console.log(err);
          return;
        }

        fileCommits.push(commits[0].id);
      });
    }

    // Switch to staging branch -> cherry pick all the commits -> switch back to dev branch
    _repo.checkout("staging", function(err) {
      if (err) {
        console.log(err);
        return;
      }

      var loopcount = fileCommits.length;
      for (var i=0; i<fileCommits.length; i++) {
        _repo.cherrypick(fileCommits[i], {"strategy": "recursive", "strategy-option": "theirs"}, function(err){
          if (!loopcount--) {
            _repo.checkout("master", function(err) {
              if (err) {
                console.log(err);
              }
            });
          }

          if (err)
            console.log(err);
        });
      }
    });

  }

  /*
    Publish everything!! -- Switch to staging branch -> merge with master branch -> switch back to master
  */
  exports.publishAll = function(msg) {
    _repo.checkout("staging", function(err) {
      if (err) {
        console.log(err);
        return;
      }

      _repo.merge("master", "Publish <DATE>\n" + msg, function(err) {
        if (err) {
          console.log(err);
          return;
        }

        _repo.checkout("master", function(err){
          if (err) {
            console.log(err);
            return;
          }

        })
      })
    });
  }


}).call(this);
