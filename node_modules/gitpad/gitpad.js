(function() {
  "use strict";

  var _git = require("gift");
  var _repo = null;

  /*
    Utilities
  */
  // Get todays date
  Date.prototype.today = function(){ 
      return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
  };

  // Get current time
  Date.prototype.time = function(){
       return ((this.getHours() < 10)?"0":"") + this.getHours() +"-"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +"-"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
  };

  // Get date and time, joining with '@'
  var now = function() {
    var date = new Date();
    return date.today() + '/' + date.time();
  };

  // Attempt to go back to master branch and panic out if error occurs
  var resume = function(callback) {
    _repo.checkout("master", function(err) {
      if (err) {
        throw new Error("Fatal: Unable to resume original resource branch! Error:" + err);
      }

      callback();
    });
  };

  /*
    Initialize git repository
    - path: path to your git repo, relative to where the script is called (ex, docpad root).
    - callback(optional): receives (err, status). Be ware: if you don't use a callback, make sure the init happens before
    -   all other git operations
  */
  exports.init = function(path, callback) {
    if (!path) throw new Error("must specify a path for git repo");

    _repo = _git(path);
    _repo.status(function(err, status) {
      if (err) {
        // Init failed
        console.log("Git repo initialization failed: " + err);

      } else {
        // Init successful
        console.log("Git repo initialization successful!");
      }

      if (callback)
        callback(err, status);
    });
  };


  /*
    Attempt remedy from errors
  */
  


  //
  //===== Show repo status (clean? tracked/untracked files?)
  //
  exports.showStatus = function(callback) {
    _repo.status(callback);
  };


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
    - limit(optional): an integer indicating how many commits to be shown, put "all" if want to see all commits (default 10)
    - callback: receives (err, commits)
  */
  exports.showFileHistory = function(filename, limit, callback) {
    _repo.file_history(filename, limit, callback);
  };

  /*
    Lists most recent commits applied to the whole repo (branch is default to "master")
    - limit: how many commits to return
    - skip(optional): how many commits to skip (for pagination)
    - callback: receives (err, commits)
  */
  exports.showHistory = function(limit, skip, callback) {
    _repo.commits("master", limit, skip, callback);
  };

  /*
    Add the file to be saved into current commit and commit the file
    - filename: name of the file to be saved
    - msg: a message associated to the save action
    - callback: receives (err)
  */
  exports.saveFile = function(filename, msg, callback) {
    _repo.add(filename, function(err) {
      if (err) {
        callback(err);
        return;
      }

      _repo.commit('Saved file "' + filename + '": ' + msg, {}, callback);
    });
  };

  /*
    Remove a file from file system, then commit the removal
    - filename: name of the file to be removed
    - msg: a message associated to the removal
    - callback: receives (err)
    - NOTE: File removed by this command can be retrived back by using revertFile
  */
  exports.removeFile = function(filename, msg, callback) {
    _repo.remove(filename, function(err) {
      if (err) {
        callback(err);
        return;
      }

      _repo.commit('Removed file "' + filename + '": ' + msg, {}, callback);
    });
  };

  /*
    Revert a file back to a previous commited state, and then commit the revert
    - commitID: ID of the commit to revert to
    - filename: name of the file to be reverted
    - msg: a message associated to the revert
    - callback: receives (err)
  */
  exports.revertFile = function(commitID, filename, msg, callback) {
    _repo.checkoutFile(commitID, filename, function(err) {
      if (err) {
        callback(err);
        return;
      }

      exports.saveFile(filename, 'Reverted file "' + filename + '" to previous version from snapshot ID ' + commitID + ': ' + msg, callback);
    });
  };

  /*
    Publish selected file(s) (pushes selective file(s) from local repo to remote repo)
    - files: list of names of the files to be published
    - callback: receives (err), be aware that this will possibly be called multiple times, once for every file
    - NOTE: So many steps! So many things could go wrong! How should we remedy from them? 
    - At each step where error happens, try to remedy by rolling back the changes.
  */
  exports.publishFiles = function(files, msg, callback) {
    var fileCommits = [];
    // Get all the commit ids needing to be cherry-picked
    var fileCount = files.length;

    // Define the callback function here instead of using anonymous functions in the actual loop
    var fetchHistoryCallback = function(err, commits) {
      if (err) {
        callback(err);
        return;
      }

      fileCommits.push(commits[0].id);

      if (!--fileCount) {
        // Complete flow:
        // Step 1. Create (and automatically switch to) temp branch based on staging branch for this publish
        var temp_branch = "Publish-"+now();
        _repo.duplicate_branch(temp_branch, "staging", function(err) {
          if (err) {
            callback(err);
            // Error: failed to create temp branch, attempt to resume back to master
            resume();
            return;
          }

          // Step 2. Cherry-pick all the commits into temp branch
          var cherryCount = fileCommits.length;
          var cherrypickCallback = function(err) {
            if (err) {
              callback(err);
              // Error: failed to cherry-pick commits, attempt to go back to master and delete temp branch
              resume(function() {
                _repo.delete_branch(temp_branch, true, function(err) {
                  if (err) throw new Error("Attempt to remedy has failed! Unable to delete temporary branch! " + err);
                });
              });

              return;
            }

            // Step 3. Switch to staging branch
            if (!--cherryCount) {
              _repo.checkout("staging", function(err) {
                if (err) {
                  callback(err);
                  // Error: failed to switch to staging, attempt to go back to master and delete temp branch
                  resume(function() {
                    _repo.delete_branch(temp_branch, function(err) {
                      if (err) throw new Error("Attempt to remedy has failed! Unable to delete temporary branch! " + err);
                    });
                  });
                  return;
                }

                // Step 4. Use "merge --squash" to grab all the commits from temp into staging
                _repo.merge(temp_branch, {squash: true}, "This comment will be ignored by git", function(err) {
                  if (err) {
                    callback(err);
                    // Error: failed to squash merge commits from temp to staging, attempt to reset any possible partial changes 
                    //  on staging, go back to master and delete temp branch
                    _repo.resetHEAD(0, true, function(err) {
                      if (err) throw new Error("Attempt to remedy has failed! Unable to clean up staging branch! " + err);

                      resume(function() {
                        _repo.delete_branch(temp_branch, true, function(err) {
                          if (err) throw new Error("Attempt to remedy has failed! Unable to delete temporary branch! " + err);
                        });
                      });
                    });
                    return;
                  }

                  // Step 5. Commit changes squashed from temp branch
                  _repo.commit("Publish <DATE>\n" + msg, {a: true}, function(err) {
                    if (err) {
                      callback(err);
                      // Error: failed to commit changes, attempt to reset any outstanding changes on staging, go back to master
                      //  and delete temp branch
                      _repo.resetHEAD(0, true, function(err) {
                        if (err) throw new Error("Attempt to remedy has failed! Unable to clean up staging branch! " + err);

                        resume(function() {
                          _repo.delete_branch(temp_branch, true, function(err) {
                            if (err) throw new Error("Attempt to remedy has failed! Unable to delete temporary branch! " + err);
                          });
                        });
                      });
                      return;
                    }
                    // Step 6. Delete temp branch
                    // Maybe we wanna keep it??

                    // Step 7. Switch back to master branch
                    resume(callback);
                  });
                });
              });
            }
          };

          for (var i=0; i<fileCommits.length; i++) {
            _repo.cherrypick(fileCommits[i], {"strategy": "recursive", "strategy-option": "theirs"}, cherrypickCallback);
          }
        });
      }
    };

    // Actual loop of where the fetch histroy happens
    for (var i=0; i<files.length; i++) {
      _repo.file_history(files[i], 1, fetchHistoryCallback);
    }
  };

  /*
    Publish everything!! -- Switch to staging branch -> merge squash with master branch -> commit -> switch back to master
    - msg: a message associated with the publish
    - callback: receives (err)
  */
  exports.publishAll = function(msg, callback) {
    _repo.checkout("staging", function(err) {
      if (err) {
        callback(err);
        // Error: failed to checkout staging branch, stay on master
        resume();
        return;
      }

      _repo.merge("master", {"squash": true}, "This comment will be ignored by git", function(err) {
        if (err) {
          callback(err);
          // Error: failed to squash commit, reset any possible partial changes and switch back to master
          _repo.resetHEAD(0, true, function(err) {
            if (err) throw new Error("Attempt to remedy has failed! Unable to clean up staging branch! " + err);
            resume();
          });
          return;
        }

        _repo.commit("Publish <DATE>\n" + msg, {a: true}, function(err) {
          if (err) {
            callback(err);
            // Error: failed to squash commit, reset any possible partial changes and switch back to master
            _repo.resetHEAD(0, true, function(err) {
              if (err) throw new Error("Attempt to remedy has failed! Unable to clean up staging branch! " + err);
              resume();
            });
            return;
          }

          resume(callback);
        })
      });
    });
  };

}).call(this);
