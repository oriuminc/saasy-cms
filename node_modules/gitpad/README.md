# gitpad v0.2.2

Allows git ops for saasy cms. 

For the current version to work, you need to init a git repo by yourself at the desired location, with two branches: master, staging.
master: dev branch where all the edit happens  
staging: contains published files  

Directory structure looks something like this:  
- my_dp_helloworld (root dir of dp project)  
  - node_modules (contains all node addons, including this module)  
  - out (output dir)  
  - plugins (dp plugins)  
  - src  

# Usage:  

## Init repo:  
    gitpad = require('gitpad')  
    gitpad.init('path/to/repo', callback) // if path ommited will use ".", callback receives (err, status)
                                          // look for console output to check success
  
For available file control ops read gitpad.js.  
  
## TODO:  
~~1. Error handling~~  
~~2. More robust init process~~  
~~3. Compress cherry-picked commits into one "publish" commit~~  
~~4. More robust error remedy policy~~  
5. Add capability to publish staging branch to a remote repository  


## Update:
v0.2.2  - added more robust error handling mechanism for the publish workflow  
v0.2.1  - fixed the publishFiles function to group cherry-picked commits to a single publish commit utilizing temp branches  
v0.2    - modified the functions to accept callback, leaving error handling implementation to user  
v0.1    - initial alpha version  
