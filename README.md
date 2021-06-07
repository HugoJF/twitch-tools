# Twitch Tools

Cool library to work with Twitch stuff 

### TODO
 - Add parameter to specify Twitch API instance on every class that uses the API;
 - Add function to set logger instance externally;
 - Use environment variables to detect project base path;
 - ~~Group files by usage (Twitch related, helpers, types, etc)~~;
 - Completely remove configs.ts;
 - appPath(), videosPath() should be in filesystem.ts;
 - convert() should not be here;
 - Setup tests
 - Remove Environment types.
 
New conversion API
```
MBps_to_bps = [
    Mega_to_Kilo,
    Kilo_to_Unit
    Byte_to_Bit
]
```
