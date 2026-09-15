// Coded by danielswf.

import flash.external.ExternalInterface;


// ==================================================
// DEBUGGING
// ==================================================

function debug(message:String):Void
{
    trace(message);

    // Send trace to browser DevTools console.
    if (ExternalInterface.available)
    {
        try
        {
            ExternalInterface.call(
                "console.log",
                "[Hoops & Yoyo] " + message
            );
        }
        catch (e)
        {
            // ExternalInterface failed.
        }
    }
}


// ==================================================
// SOCKET
// ==================================================

var mySocket:XMLSocket = new XMLSocket();

var isConnected:Boolean = false;

var serverHost:String =
    "hoopsandyoyo-onlinerender.onrender.com";

var serverPort:Number = 10000;


// ==================================================
// PLAYERS
// ==================================================

var player:MovieClip;

var myPlayerId:String = "";

var otherPlayers:Object = {};


// ==================================================
// START
// ==================================================

debug("======================================");
debug("HOOPS & YOYO MULTIPLAYER STARTING");
debug("======================================");

debug("Server: " + serverHost);
debug("Port: " + serverPort);

debug("XMLSocket created.");


// ==================================================
// CONNECT
// ==================================================

mySocket.onConnect = function(success:Boolean):Void
{
    debug("XMLSocket onConnect fired.");
    debug("Connection result: " + success);

    if (success)
    {
        isConnected = true;

        debug("CONNECTED TO SERVER!");

        // --------------------------------------------------
        // Spawn our local player immediately.
        // Don't wait for the server.
        // --------------------------------------------------

        spawnLocalPlayer();

        // --------------------------------------------------
        // Tell server our starting position.
        // --------------------------------------------------

        var spawnPacket:String =
            "<spawn x='275' y='200' />";

        debug("Sending: " + spawnPacket);

        mySocket.send(spawnPacket);
    }
    else
    {
        isConnected = false;

        debug("FAILED TO CONNECT TO SERVER.");
    }
};


// ==================================================
// CLOSE
// ==================================================

mySocket.onClose = function():Void
{
    isConnected = false;

    debug("XMLSocket connection CLOSED.");
};


// ==================================================
// DATA RECEIVED
// ==================================================

mySocket.onData = function(data:String):Void
{
    debug("SERVER RECEIVED:");
    debug(data);

    data = data.split("\0").join("");

    if (data == "")
    {
        return;
    }


    // ==================================================
    // WELCOME
    // ==================================================

    if (data.indexOf("<welcome") == 0)
{
    debug("Received WELCOME packet.");

    var idStart:Number =
        data.indexOf("id='") + 4;

    var idEnd:Number =
        data.indexOf("'", idStart);

    if (idStart >= 4 && idEnd > idStart)
    {
        myPlayerId =
            data.substring(idStart, idEnd);

        debug(
            "My player ID = " +
            myPlayerId
        );
    }

    // ================================================
    // SPAWN LOCAL CHARACTER
    // ================================================

    spawnLocalPlayer();

    // ================================================
    // SEND USERNAME + POSITION
    // ================================================

    var spawnPacket:String =
        "<spawn x='275' y='200' username='" +
        _root.playerUsername +
        "' />";

    debug(
        "Sending spawn: " +
        spawnPacket
    );

    mySocket.send(spawnPacket);

    return;
}


    // ==================================================
    // SPAWN
    // ==================================================

    if (data.indexOf("<spawn") == 0)
    {
        debug("Received SPAWN packet.");

        var spawnId:String =
            getAttribute(data, "id");

        var spawnX:Number =
            Number(getAttribute(data, "x"));

        var spawnY:Number =
            Number(getAttribute(data, "y"));

        debug(
            "Spawn ID: " +
            spawnId +
            " X: " +
            spawnX +
            " Y: " +
            spawnY
        );

        if (
            spawnId != "" &&
            spawnId != myPlayerId
        )
        {
            spawnOtherPlayer(
                spawnId,
                spawnX,
                spawnY
            );
        }

        return;
    }


    // ==================================================
    // MOVE
    // ==================================================

    if (data.indexOf("<move") == 0)
    {
        debug("Received MOVE packet.");

        var moveId:String =
            getAttribute(data, "id");

        var moveX:Number =
            Number(getAttribute(data, "x"));

        var moveY:Number =
            Number(getAttribute(data, "y"));

        debug(
            "Move ID: " +
            moveId +
            " X: " +
            moveX +
            " Y: " +
            moveY
        );

        if (moveId != myPlayerId)
        {
            if (otherPlayers[moveId] != undefined)
            {
                otherPlayers[moveId]._x = moveX;
                otherPlayers[moveId]._y = moveY;
            }
            else
            {
                // Player doesn't exist yet.
                // Spawn them automatically.
                spawnOtherPlayer(
                    moveId,
                    moveX,
                    moveY
                );
            }
        }

        return;
    }


    // ==================================================
    // LEAVE
    // ==================================================

    if (data.indexOf("<leave") == 0)
    {
        debug("Received LEAVE packet.");

        var leaveId:String =
            getAttribute(data, "id");

        if (
            leaveId != "" &&
            otherPlayers[leaveId] != undefined
        )
        {
            otherPlayers[leaveId].removeMovieClip();

            delete otherPlayers[leaveId];

            debug(
                "Removed player: " +
                leaveId
            );
        }

        return;
    }


    debug("Unknown packet received.");
};


// ==================================================
// XML ATTRIBUTE HELPER
// ==================================================

function getAttribute(
    text:String,
    attribute:String
):String
{
    var search:String =
        attribute + "='";

    var start:Number =
        text.indexOf(search);

    if (start < 0)
    {
        // Also support double quotes.
        search =
            attribute + "=\"";

        start =
            text.indexOf(search);

        if (start < 0)
        {
            return "";
        }

        start += search.length;

        var endDouble:Number =
            text.indexOf("\"", start);

        if (endDouble < 0)
        {
            return "";
        }

        return text.substring(
            start,
            endDouble
        );
    }

    start += search.length;

    var end:Number =
        text.indexOf("'", start);

    if (end < 0)
    {
        return "";
    }

    return text.substring(
        start,
        end
    );
}


// ==================================================
// LOCAL PLAYER
// ==================================================

function spawnLocalPlayer():Void
{
    if (player != undefined)
    {
        debug("Local player already exists.");
        return;
    }

    debug("Attempting to spawn local player...");

    player = _root.attachMovie(
        "CharacterPlayerMC",
        "player_mc",
        _root.getNextHighestDepth()
    );

    if (player == undefined)
    {
        debug("ERROR: attachMovie FAILED!");
        return;
    }

    player._x = 275;
    player._y = 200;

    // ================================================
    // SET USERNAME
    // ================================================

    if (
        player.userName != undefined &&
        _root.playerUsername != undefined
    )
    {
        player.userName.text =
            _root.playerUsername;
    }

    debug(
        "LOCAL PLAYER SPAWNED!"
    );

    debug(
        "Username: " +
        _root.playerUsername
    );

    debug(
        "Player object: " +
        player
    );
}


// ==================================================
// OTHER PLAYER
// ==================================================

function spawnOtherPlayer(
    id:String,
    x:Number,
    y:Number
):Void
{
    if (id == "")
    {
        debug(
            "Cannot spawn player with empty ID."
        );

        return;
    }

    if (otherPlayers[id] != undefined)
    {
        debug(
            "Player already exists: " +
            id
        );

        return;
    }

    var name:String =
        "player_" + id;

    debug(
        "Spawning remote player: " +
        id
    );

    var p:MovieClip =
        _root.attachMovie(
            "CharacterPlayerMC",
            name,
            _root.getNextHighestDepth()
        );

    if (p == undefined)
    {
        debug(
            "ERROR: Failed to spawn remote player " +
            id
        );

        return;
    }

    p._x = x;
    p._y = y;

    otherPlayers[id] = p;

    debug(
        "REMOTE PLAYER SPAWNED: " +
        id
    );
}


// ==================================================
// MOVEMENT
// ==================================================

var walkSpeed:Number = 6;

_root.onMouseDown = function():Void
{
    if (player == undefined)
    {
        debug(
            "Cannot move: local player doesn't exist."
        );

        return;
    }

    player.targetX =
        _root._xmouse;

    player.targetY =
        _root._ymouse;


    // ==================================================
    // SEND MOVEMENT
    // ==================================================

    if (
        mySocket != undefined &&
        isConnected
    )
    {
        var movePacket:String =
            "<move x='" +
            player.targetX +
            "' y='" +
            player.targetY +
            "' />";

        debug(
            "Sending: " +
            movePacket
        );

        mySocket.send(movePacket);
    }
    else
    {
        debug(
            "NOT CONNECTED - movement not sent."
        );
    }


    // ==================================================
    // LOCAL MOVEMENT
    // ==================================================

    player.onEnterFrame = function():Void
    {
        var dx:Number =
            this.targetX - this._x;

        var dy:Number =
            this.targetY - this._y;

        var dist:Number =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (dist > walkSpeed)
        {
            this._x +=
                (dx / dist) *
                walkSpeed;

            this._y +=
                (dy / dist) *
                walkSpeed;
        }
        else
        {
            this._x =
                this.targetX;

            this._y =
                this.targetY;

            delete this.onEnterFrame;
        }
    };
};


// ==================================================
// CONNECT TO SERVER
// ==================================================

debug(
    "Calling XMLSocket.connect()..."
);

mySocket.connect(
    serverHost,
    serverPort
);

debug(
    "XMLSocket.connect() called."
);
