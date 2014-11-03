/*
    @licstart  The following is the entire license notice for the 
    JavaScript code in this page.

    Copyright (C) 2014  SylvieLorxu <sylvie@contracode.nl>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    @licend  The above is the entire license notice
    for the JavaScript code in this page.
*/

$(document).ready( function() {
    // Register empty command history command
    window.commandhistory = [];
    window.commandposition = 0;

    // Focus on the input bar
    document.getElementById("inputbar").focus();

    playing = false;

    $("#inputbar").keydown( function(event) {
        // Let the user use the up/down keys to go through command history
        if (event.keyCode == 38) { // Up
            event.preventDefault();
            if (commandhistory && commandposition) {
                commandposition -= 1;
                $("#inputbar").val(commandhistory[commandposition]);
            }
        } else if (event.keyCode == 40) { // Down
            event.preventDefault();
            if (commandhistory && commandposition < commandhistory.length) {
                commandposition += 1;
                $("#inputbar").val(commandhistory[commandposition]);
            }
        // When the user presses enter and has text in the input field, parse it
        } else if (event.which == 13) {
            event.preventDefault();
            var input = $("#inputbar").val();
            if (input) {
                if (commandhistory[commandhistory.length-1] != input) {
                    commandhistory.push(input);
                    commandposition = commandhistory.length;
                }
                parseInput(input);
            }
        }
    });

    // Ensure input bar takes all input by ensuring focus on input
    $("body").keydown( function(event) {
        $("#inputbar").focus();
    });

    // Save the session on unload
    window.addEventListener("beforeunload", function( event ) {
        if (!playing) { return; }
        show("Saving session...");
        saveSession();
        show("Saving session... Done!");
    });

    // Show home screen
    showHome();

    // Check if a game URL has already been passed (example.com/HERITAGE/?url_to_load)
    var toload = window.location.search.substring(1);
    if (toload) {
        parseInput("load " + toload);
    }
});

var showHome = function() {
    $("#message").html('<p>Welcome to HERITAGE alpha.</p><p>Heritage Equals Retro Interpreting Text Adventure Game Engine</p><p>Type "help" for help.</p>');
    if (supports_html_storage && localStorage.length > 0) {
        show($("#message").html() + 'Saved sessions found. Type "loadsave" to load a saved session, or "clearsaves" to delete all sessions in progress.', "html");
    }
};

var supports_html_storage = function () {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
};

var saveSession = function() {
    if (!gameinfo["Title"]) { gameinfo["Title"] = "Unknown Game" }
    if (!gameinfo["Author"]) { gameinfo["Author"] = "Unknown Author" }
    var session = {
        'savetime' : (new Date).getTime(),
        'commandhistory' : commandhistory,
        'gameinfo' : gameinfo,
        'variables' : variables,
        'rooms' : rooms,
        'roomhistory' : roomhistory,
        'items' : items,
        'actions' : actions,
        'exits' : exits,
        'inventory' : inventory,
        'currentlocation' : currentlocation
    };
    localStorage.setItem(localStorage.length, JSON.stringify(session));
};

var loadSession = function(id) {
    var restore_session = localStorage[id - 1];
    if (!restore_session) {
        show("Could not find session with id " + id);
        return;
    }
    var restore_session = JSON.parse(localStorage[id - 1]);
    commandhistory = restore_session["commandhistory"];
    gameinfo = restore_session["gameinfo"];
    variables = restore_session["variables"];
    rooms = restore_session["rooms"];
    roomhistory = restore_session["roomhistory"];
    items = restore_session["items"];
    actions = restore_session["actions"];
    exits = restore_session["exits"];
    inventory = restore_session["inventory"];
    currentlocation = restore_session["currentlocation"];
    localStorage.removeItem(id - 1);
    parseInput("start");
};

var escapeHTML = function( s ) {
    return String(s).replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

var show = function(message, type) {
    if (typeof(variables) != "undefined" && variables["_game_over"]) { type = "game_over"; }
    if (type != "html") {
        var message = escapeHTML(message).split("\n").join("<br />");
        if (message.substr(0,6) == "<br />") {
            message = message.substr(6);
        }
    };
    switch (type) {
        case "error": $("#message").html("<span class='error'>" + message + "</span>"); break;
        case "html": $("#message").html("<p>" + message + "</p>"); break;
        case "game_over": $("#message").html("<p>" + message + "</p><p class='error'>GAME OVER<br />Type 'start' to replay, or 'load' another game.</p>"); playing = false; break;
        default: $("#message").html("<p>" + message + "</p>");
    }
};

var init = function(filename) {
    // Load all the game data into Javascript variables so that it can be played
    show("Loading game file...");
    // Init necessary vars
    playing = false;
    currentsetting = "";
    gameinfo = {};
    variables = {"_game_over": 0, "_turn": 0};
    rooms = {};
    roomhistory = [];
    items = {};
    actions = {};
    exits = {};
    inventory = [];
    currentmode = null;
    $.get(filename, function( gamedata ) {
        show("Parsing game...");
        gamedata = gamedata.split('\n');
        $.each(gamedata, function(){
            var gameline = this.replace(/\/\*.*?\*\//g, "").trim(); // Trim the line and remove all comments
            newmode = initGetMode(gameline, currentmode);
            if (currentmode && (currentmode == newmode)) { parseForMode(gameline, currentmode); }
            currentmode = newmode;
        });
        currentlocation = "0.0.0";
        // Done initializing, display info!
        gamemessage = "";
        for (info in gameinfo) {
            gamemessage += escapeHTML(info + ": " + gameinfo[info]) + "<br />";
        };
        show(gamemessage + "<br /><a href='" + filename + "'>Game source (right click to download)</a><br /><br />Type start to start", "html");
    }, "text").fail(function() { show("Failed to load game files (AJAX request failed)", "error") });
};

var startgame = function() {
    playing = true;
    userLook();
};

var initGetMode = function(line, currentmode) {
    if (line.substr(0,5) == "info(") {
        return ["info"];
    } else if (line.substr(0,4) == "var(") {
        varandvalue = line.substr(4).split(")")[0];
        if (varandvalue.indexOf(",") > -1) {
            variables[varandvalue.split(",")[0]] = varandvalue.split(",")[1];
        } else {
            variables[varandvalue] = 0;
        };
    } else if (line.substr(0,5) == "room(") {
        var roomlocation = line.substr(5).split(")")[0];
        rooms[roomlocation] = {};
        // These need to exist, so make them empty in case the game doesn't define them
        rooms[roomlocation]["description"] = "";
        rooms[roomlocation]["items"] = "";
        rooms[roomlocation]["exits"] = "";
        return ["room", roomlocation];
    } else if (line.substr(0,5) == "item(") {
        var iteminfo = line.substr(5).split(")")[0].trim();
        items[iteminfo] = {};
        return ["item", iteminfo]
    } else if (line.substr(0,7) == "action(") {
        var actioninfo = line.substr(7).split(")")[0];
        var dotsplit = actioninfo.lastIndexOf(".");
        if (dotsplit > -1) {
            var addtophrase = actioninfo.substr(dotsplit);
            var actioninforeal = actioninfo.substr(0,dotsplit);
        } else {
            var addtophrase = "";
            var actioninforeal = actioninfo;
        }
        phrases = actioninforeal.split("|");
        for (phrase in phrases) {
            phrase = phrases[phrase].trim() + addtophrase;
            actions[phrase] = {};
        };
        return ["action", actioninfo];
    } else if (line.substr(0,5) == "exit(") {
        var exitinfo = line.substr(5).split(")")[0];
        exits[exitinfo] = {};
        return ["exit", exitinfo];
    } else {
        return currentmode;
    };
};

var returnSettingAndValue = function(line) {
    line = line.trim();
    linesplit = line.indexOf(":");
    firstspace = line.indexOf(" ");
    checkorset = ["$(", "#("].indexOf(line.substr(0,2)) > -1;
    if (checkorset | linesplit == -1 | firstspace < linesplit) {
        return [currentsetting, line];
    } else {
        currentsetting = line.substr(0,linesplit).trim();
        return [currentsetting, line.substr(linesplit+1).trim()];
    }
};

var parseForMode = function(line, currentmode) {
    switch (currentmode[0]) {
        case "info":
            var linedata = returnSettingAndValue(line);
            if (!gameinfo[linedata[0]]) {
                gameinfo[linedata[0]] = "";
            } else {
                gameinfo[linedata[0]] += "\n";
            }
            gameinfo[linedata[0]] += linedata[1];
            break;
        case "room":
            var linedata = returnSettingAndValue(line);
            if (!rooms[currentmode[1]][linedata[0]]) {
                rooms[currentmode[1]][linedata[0]] = "";
            } else {
                if (["description"].indexOf(linedata[0]) > -1 || ["first_enter"].indexOf(linedata[0]) > -1) {
                    rooms[currentmode[1]][linedata[0]] += "\n";
                }
            }
            rooms[currentmode[1]][linedata[0]] += linedata[1];
            break;
        case "item":
            var itemdata = returnSettingAndValue(line);
            if (!items[currentmode[1]][itemdata[0]]) {
                items[currentmode[1]][itemdata[0]] = "";
            } else {
                items[currentmode[1]][itemdata[0]] += "\n";
            }
            items[currentmode[1]][itemdata[0]] += itemdata[1].trim();
            break;
        case "action":
            var dotsplit = currentmode[1].lastIndexOf(".");
            if (dotsplit > -1) {
                var addtophrase = currentmode[1].substr(dotsplit);
                var phrasedata = currentmode[1].substr(0,dotsplit);
            } else {
                var addtophrase = "";
                var phrasedata = currentmode[1];
            }
            var phrases = phrasedata.split("|");
            for (phrase in phrases) {
                var phrase = phrases[phrase].trim() + addtophrase;
                var linedata = returnSettingAndValue(line);
                if (!actions[phrase][linedata[0]]) { actions[phrase][linedata[0]] = ""; }
                if (["succeed", "fail"].indexOf(linedata[0]) > -1 && actions[phrase][linedata[0]]) { actions[phrase][linedata[0]] += "\n"; }
                actions[phrase][linedata[0]] += linedata[1];
            };
            break;
        case "exit":
            var linedata = returnSettingAndValue(line);
            if (!exits[currentmode[1]][linedata[0]]) { exits[currentmode[1]][linedata[0]] = ""; }
            if (["succeed", "fail"].indexOf(linedata[0]) > -1 && exits[currentmode[1]][linedata[0]]) { exits[currentmode[1]][linedata[0]] += "\n"; }
            exits[currentmode[1]][linedata[0]] += linedata[1];
            break;
    };
};

var parseInput = function(input) {
    /* This function receives the input, and passes it on to another function 
     * which will return 0 on success, and non-zero on fail.
     * If the input was succesful, and we're playing a match, we increment the 
     * current turn pseudo-variable by one.
     */
    $( "#inputbar" ).val("");
    var failure = parseInputReal(input);
    if(!failure) {
      variables["_turn"] += 1;
    };
};

var parseInputReal = function(input) {
    /* This function parses the input and returns an error code.
     * 0 = success
     * 1 = succesful command that should not be counted as a turn
     * 2 = invalid command
     * 3 = invalid parameters
     * 4 = executing command changes nothing
     */
    var input = input.trim();
    var splitinput = input.split(" ");

    // Core functions
    switch (splitinput[0]) {
        case "help":
            show("Type 'load &lt;gamename/URL&gt;' to load a game. An example game is available under the name 'example' (type 'load example' to load it).</p><p>When in-game, you can look around using 'look', go somewhere using 'go', take something using 'take' or 'grab' and check your inventory using 'inventory'.</p><p>That is all for the introduction.</p><p>Remember, games can register any commands themselves. 'look at' posters, 'sit on' a chair, experiment and have fun!", "html");
            return 1;
        case "load":
            // Start initializing the chosen game
            if (splitinput.length > 1) {
                var toload = splitinput.splice(1).join("%20");
                if (toload[-9,toload.length] != ".heritage") { toload += ".heritage"; };
                init(toload);
            } else {
                 show("Error: Incorrect argument count. Correct usage: 'load <gamename/URL>'.", "error");
            };
            return 1;
        case "loadsave":
            // Restore a saved session
            if (playing) { break; }
            if (localStorage.length == 0) { show("There are no sessions in progress to load"); return 1; }
            if (splitinput.length > 1) {
                loadSession(splitinput[1]);
            } else {
                var toshow = ["To restore a session, type 'loadsave' followed by the session number.<br />"];
                for (savegame in localStorage) {
                    var sessiondata = JSON.parse(localStorage[savegame]);
                    toshow.push(toshow.length + ". " + sessiondata["gameinfo"]["Title"] + " - " + sessiondata["gameinfo"]["Author"] + " (" + sessiondata["savetime"] + ")");
                }
                show(toshow.join("<br />"), "html");
            }
            return 1;
        case "clearsaves":
            // Delete all saves
            if (playing) { break; }
            localStorage.clear();
            showHome();
        case "start":
            if (splitinput.length == 1 && !playing) {
                if (typeof(variables) != "undefined") {
                    variables["_game_over"] = 0;
                };
                startgame();
                return 1;
            };
            break;
        case "inventory":
            if (!playing) { break; }
            userInventory();
            return 1;
        case "go":
            if (!playing) { break; }
            if (splitinput.length < 1) {
                show("Error: Incorrect argument count. Correct usage: 'go <direction>'.", "error");
                return 3;
            };

            var movefail = userMove(splitinput.slice(1).join(" "), false);
            if (!movefail) {
                if (rooms[currentlocation]["first_enter"] && (roomhistory.indexOf(currentlocation) == -1)) {
                    show(format(rooms[currentlocation]["first_enter"]));
                } else {
                    userLook();
                };
                if (roomhistory.indexOf(currentlocation == -1)) {
                    roomhistory.push(currentlocation);
                };
            };
            return 0;
        case "take":
        case "grab":
        case "pick":
            if (!playing) { break; }
            var errcode = userTake(splitinput, false);
            switch (errcode) {
                case 0: return 0;
                case 1: show("Error: Incorrect argument count. Correct usage: 'take <itemname>'.", "error"); return 3;
                case 2: break; // It starts with pick but it's not "pick up"
                default: return 3;
            };
        case "look":
            if (!playing) { break; }
            // Ensure the user is only looking. Items should have their own on_look_at handler
            if (splitinput.length == 1) {
                userLook();
                return 1;
            };
            break;
        case "wait":
            if (!playing) { break; }
            show("You wait...");
            return 0;
    };

    if (!playing) {
        if (typeof(variables) == "undefined" || !variables["_game_over"]) {
            show("Invalid command.");
        };
        return 1;
    };

    // Check for actions
    var toshow = "";
    var success = false;
    for (action in actions) {
        var action = action;
        var dotsplit = action.lastIndexOf(".");
        if (dotsplit > -1) {
            var actionname = action.substr(0,dotsplit);
        } else {
            var actionname = action;
        }
        if (actionname == input) {
            if (conditionsSatisfied(actions[action])) {
                success = true;
                executeActions(actions[action]);
                if (actions[action]["succeed"]) {
                    var addtotoshow = format(actions[action]["succeed"]);
                    if (addtotoshow) { toshow += "\n" + addtotoshow; }
                }
            } else {
                if (actions[action]["fail"]) {
                    var addtotoshow = format(actions[action]["fail"]);
                    if (addtotoshow) { toshow += "\n" + addtotoshow; }
                }
            }
        }
    };
    if (toshow) {
        show(toshow);
        if (success) {
            return 0;
        } else {
            return 4;
        }
    };

    // Check for specific item functions
    var roomitems = getRoomItems(currentlocation);
    for (item in roomitems) {
        var item = roomitems[item];
        var inputitemname = "";
        if (item.substr(0,4) == "syn:") {
            // Translate synonym
            var itemdata = item.substr(4).split(":");
            var item = itemdata[1];
            var inputitemname = itemdata[0].split(" ");
        }
        if (item.indexOf(".") > -1) {
            var itemdata = item.split(".");
            var itemname = itemdata[0].split(" ");
            var iteminstance = "." + itemdata[1];
        } else {
            var itemname = item.split(" ");
            var iteminstance = "";
        }
        if (!inputitemname) { var inputitemname = itemname; };
        if (splitinput.slice(splitinput.length-itemname.length).join("_") == splitinputitemname.join("_") ) {
            var itemhandler = splitinput.slice(0,splitinput.length-itemname.length);
            var tofind = "on_" + itemhandler.join("_");
            var itemfind = itemname + iteminstance;
            if (items[itemfind] && items[itemfind][tofind]) {
                show(format(items[itemfind][tofind]));
                return 0;
            } else {
                show("I don't know how to " + itemhandler.join(" ") + " the " + inputitemname + ".");
                return 4;
            }
        }
    };

    // Generic error
    show("I don't know how to " + input + ".");
    return 1;
};

var conditionsSatisfied = function(objectid) {
    for (condition in objectid) {
        var conditions = objectid[condition].replace(/ /g, "").split(",");
        switch (condition) {
            case "require_location":
                var requiredlocation = conditions[0];
                var requiredlist = conditions.slice(1);
                for (required in requiredlist) {
                    if (getRoomItems(requiredlocation).indexOf(requiredlist[required]) == -1) { return false; };
                };
                break;
            case "require_here":
                for (required in conditions) {
                    if (getRoomItems(currentlocation).indexOf(conditions[required]) == -1) { return false; };
                };
                break;
            case "require_inventory":
                for (required in conditions) {
                    if (inventory.indexOf(conditions[required]) == -1) { return false; };
                };
                break;
            case "equals":
                if (getVarValue(conditions[0]) != conditions[1]) { return false; };
                break;
            case "less_than":
                if (getVarValue(conditions[0]) > conditions[1]) { return false; };
                break;
            case "more_than":
                if (getVarValue(conditions[0]) < conditions[1]) { return false; };
                break;
        };
    };
    return true;
};

var executeActions = function(objectid) {
    for (action in objectid) {
        var itemlist = objectid[action].replace(/ /g, "").split(",");
        switch (action) {
            case "lose":
                for (item in itemlist) {
                    var item = itemlist[item];
                    var index = inventory.indexOf(item);
                    if (index > -1) {
                        inventory.splice(index, 1);
                    };
                };
                break;
            case "gain":
                for (item in itemlist) {
                    var item = itemlist[item];
                    inventory.push(item);
                };
                break;
            case "drop":
                for (item in itemlist) {
                    var item = itemlist[item];
                    var index = inventory.indexOf(item);
                    if (index > -1) {
                        inventory.splice(index, 1);
                    };
                    addRoomItem(currentlocation, item);
                };
                break;
            case "disappear":
                for (item in itemlist) {
                    var item = itemlist[item];
                    removeRoomItem(currentlocation, item);
                };
                break;
        };
    };
};

var userLook = function() {
    description = format(rooms[currentlocation]["description"]);
    show(description);
};

var format = function(text) {
    /* Format and calculate text and its values
     * This format finds the most inner check, and then calculates outwards.
     * Example order:
     * $(Fourth #(Third @(Second !(First)! )@ #) )$
     */
    var minindex = 0;
    var characters = "!@#$";

    while(true) {
        var checkon = text.substr(minindex);

        var closingposition = checkon.indexOf(")");
        if (closingposition == -1) {
            break;
        };

        var character = checkon[closingposition + 1];
        if (characters.indexOf(character) == -1) {
            minindex = closingposition+1;
            continue;
        };

        var start = checkon.substr(0, closingposition - 1).lastIndexOf(character + "(");

        if (start == -1) {
            break;
        };

        var manipulatetext = checkon.substr(start + 2, closingposition - 2 - start);

        console.log("Text: " + text);
        console.log("Manipulate: " + manipulatetext);

        switch(character) {
            case "!": var newtext = echoVar(manipulatetext); break;
            case "@": var newtext = calculateVarValue(manipulatetext); break;
            case "#": var newtext = changeVarValue(manipulatetext); break;
            case "$": var newtext = formatVariableText(manipulatetext); break;
        };

        text = text.substr(0, start) + newtext + text.substr(closingposition + 2);
        minindex = 0;
    };

    return text;
};

var getVarValue = function(variable) {
    /* Returns the value of real and pseudo-variables
     * Available pseudo-variables:
     * _random: returns a random number from 1 through 100 (inclusive)
     * _turn: get the current turn
     */
    if (variable == "_random") {
      return Math.random() * (100 - 1) + 1;
    };

    return variables[variable];
};

var calculateNewValue = function(variable, operator, value) {
    switch(operator) {
        case "+": return variable += value;
        case "-": return variable -= value;
        case "/": return variable /= value;
        case "*": return variable *= value;
        case "%": return variable %= value;
        default: return variable;
    };
};

var getOperator = function(text) {
    var operators = ["=", "+", "-", "/", "*", "%"]
    operators.forEach(function(operator) {
        if (text.indexOf(operator) > -1) {
            return operator;
        };
    });

    return null;
};

var echoVar = function(text) {
    return variables[text];
};

var calculateVarValue = function(text) {
    /* Return the result of an operation on a variable, without changing the 
     * value of the original variable
     */
    var operator = getOperator(text);

    if (!operator) {
        console.log("Invalid statement: @(" + tocheck + ")@");
        return "";
    };

    var variable = text.split(operator)[0];
    var value = text.split(operator)[1];
    return calculateNewValue(variable, operator, value);
};

var changeVarValue = function(text) {
    /* Change the value of a variable
     * This function overwrites the original variable
     */
    var operator = getOperator(text);

    if (!operator) {
        console.log("Invalid statement: #(" + tocheck + ")#");
        return "";
    };

    var variable = text.split(operator)[0];
    var value = text.split(operator)[1];
    variables[variable] = calculateNewValue(variable, operator, value);
    
    return "";
};

var formatVariableText = function(text) {
    // Remove or add text depending on certain status
    var requirement = text.split(";")[0];
    var requirement_type = requirement.split(":")[0];
    var requirement = requirement.split(":")[1];
    var text_to_add = text.substr(2+requirement_type.length+requirement.length);
    var tocheck = {};
    var text = "";
    if (requirement_type[0] == "!") {
        var requirement_type = requirement_type.substr(1);
        tocheck[requirement_type] = requirement.replace(/ /g,'');
        if (!conditionsSatisfied(tocheck)) {
            text = text_to_add;
        };
    } else {
        tocheck[requirement_type] = requirement.replace(/ /g,'');
        if (conditionsSatisfied(tocheck)) {
            text = text_to_add;
        };
    };

    return text;
};

var getRoomItems = function(roomname) {
    var itemlist = format(rooms[roomname]["items"]).replace(/ /g,'').split(",");
    var founditems = [];
    for (item in itemlist) {
        item = itemlist[item];
        var index = item.lastIndexOf(".");
        if (index > -1) {
            var special = item.substr(index);
            item = item.substr(0,index);
        } else {
            var special = "";
        }
        var itemslist = item.split("|");
        for (item in itemslist) {
            if (item == 0) {
                founditems.push(itemslist[item]+special);
            } else {
                founditems.push("syn:"+itemslist[item]+":"+itemslist[0]+special);
            }
        };
    };

    return founditems;
};

var addRoomItem = function(roomname, itemname) {
    rooms[roomname]["items"] += "," + itemname;
};

var removeRoomItem = function(roomname, itemname) {
    // TODO: This code doesn't care for edge cases /at all/. Could cause problems later on.
    itemindex = rooms[roomname]["items"].indexOf(itemname);
    rooms[roomname]["items"] = rooms[roomname]["items"].substr(0,itemindex) + rooms[roomname]["items"].substr(itemindex+itemname.length+1);
};

var getRoomExits = function(roomname) {
    // Synonyms are added as syn:synonym_name:original_name exits
    var exitlist = format(rooms[roomname]["exits"]).replace(/ /g,'').split(",");
    var foundexits = [];
    for (exit in exitlist) {
        exit = exitlist[exit];
        var index = exit.lastIndexOf(".");
        if (index > -1) {
            var special = exit.substr(index);
            exit = exit.substr(0,index);
        } else {
            var special = "";
        }
        var exitslist = exit.split("|");
        for (exit in exitslist) {
            if (exit == 0) {
                foundexits.push(exitslist[exit]+special);
            } else {
                foundexits.push("syn:"+exitslist[exit]+":"+exitslist[0]);
            }
        };
    };

    return foundexits;
};

var userInventory = function() {
    if (inventory.length > 0) {
        /* TODO: Properly display an item of which we have more than one copy or special items */
        show("You are holding: " + inventory.join(", ") + ".");
    } else {
        show("Your inventory is empty.");
    };
};

var userMove = function(direction, silent) {
    inputdirection = direction;
    roomexits = [];
    specialexits = [];
    exitlist = getRoomExits(currentlocation);
    for (exit in exitlist) {
        exit = exitlist[exit];
        if (exit.indexOf(".") > -1) {
            exit = exit.split(".");
            specialexits[exit[0]] = exit[1];
            exit = exit[0];
        } else if (exit.substr(0,4) == "syn:") {
            // Translate synonym
            exitdata = exit.substr(4).split(":");
            if (direction == exitdata[0]) {
                direction = exitdata[1];
            };
        } else {
            roomexits.push(exit);
        };
    };

    if (roomexits.indexOf(direction) > -1) {
        newlocation = calculateNewLocation(direction);
        if (rooms[newlocation]) {
            currentlocation = newlocation;
        } else {
            show("GAME ERROR: Exit points to a non-existent location. Please file a bug report to the game's creator, telling them that the exit " + inputdirection + " in room " + currentlocation + " is leading nowhere. Location was not changed.", "error");
            return 1
        };
        return
    } else if (specialexits[direction]) {
        if (conditionsSatisfied(exits[specialexits[direction]])) {
            if (exits[specialexits[direction]]["new_location"]) {
                newlocation = exits[specialexits[direction]]["new_location"];
            } else {
                newlocation = calculateNewLocation(direction);
            };
            if (rooms[newlocation]) {
                currentlocation = newlocation;
            } else {
                show("GAME ERROR: Exit points to a non-existent location. Please file a bug report to the game's creator, telling them that the exit " + inputdirection + " in room " + currentlocation + " is leading nowhere. Location was not changed.", "error");
                return 1
            };
        } else {
            show(exits[specialexits[direction]]["fail"]);
            return 1
        };
    } else if (!silent) {
        show("I can't go " + inputdirection + ".");
        return 1
    };
    return
};

var calculateNewLocation = function(direction) {
    // Split location into X, Y, Z
    newlocation = currentlocation.split(".");
    switch (direction) {
        case "north":
            newlocation[1] = parseInt(newlocation[1]); newlocation[1]++; break;
        case "east":
            newlocation[0] = parseInt(newlocation[0]); newlocation[0]++; break;
        case "south":
            newlocation[1] = parseInt(newlocation[1]); newlocation[1]--; break;
        case "west":
            newlocation[0] = parseInt(newlocation[0]); newlocation[0]--; break;
        case "up":
            newlocation[2] = parseInt(newlocation[2]); newlocation[2]++; break;
        case "down":
            newlocation[2] = parseInt(newlocation[2]); newlocation[2]--; break;
        case "northeast":
            newlocation[1] = parseInt(newlocation[1]); newlocation[1]++;
            newlocation[0] = parseInt(newlocation[0]); newlocation[0]++;
            break;
        case "northwest":
            newlocation[1] = parseInt(newlocation[1]); newlocation[1]++;
            newlocation[0] = parseInt(newlocation[0]); newlocation[0]--;
            break;
        case "southeast":
            newlocation[1] = parseInt(newlocation[1]); newlocation[1]--;
            newlocation[0] = parseInt(newlocation[0]); newlocation[0]++;
            break;
        case "southwest":
            newlocation[1] = parseInt(newlocation[1]); newlocation[1]--;
            newlocation[0] = parseInt(newlocation[0]); newlocation[0]--;
            break;
    };
    return newlocation.join(".");
};

var userTake = function(input) {
    /* Let the user take an item
     * Return values:
     * 0 = item taken
     * 1 = missing parameter
     * 2 = function called incorrectly
     * 3 = can't take item
     * 4 = can't see item
     */
    if (input.length > 2 && input[0] == "pick" && input[1] != "up") { return 2; };
    if (input.length == 1) { return 1; };
    itemname = input[input.length-1];
    arraylocation = getRoomItems(currentlocation).indexOf(itemname);
    if (arraylocation > -1) {
        if (items[itemname] && items[itemname]["allow_take"]) {
            inventory.push(itemname);
            removeRoomItem(currentlocation, itemname);
            show("You take the " + itemname + ".");
            return 0;
        } else {
            show("I can't take this " + itemname + ".");
            return 3;
        };
    } else {
        show("I don't see any " + itemname + ".");
        return 4;
    };
};
