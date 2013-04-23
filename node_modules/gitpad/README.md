# gitpad v0.1

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
    gitpad.init('path to dir containing root .git') // if argument ommited will use current directory  
    gitpad.status()                                 // check if init successful, look for output in console  
  
For available file control ops read gitpad.js.  
  
## TODO:  
1. Error handling  
2. More robust init process  
3. Compress cherry-picked commits into one "publish" commit  
