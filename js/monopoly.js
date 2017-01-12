var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.doubleTurn = false;
Monopoly.moneyAtStart = 100;
Monopoly.doubleCounter = 0;
Monopoly.maxPlayers = 6;

Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize();
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

Monopoly.start = function () {
    Monopoly.showPopup("intro")
};


Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};


Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};


Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function (player, amount) {
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0) {
        Monopoly.removePlayer(player);
        var popup = Monopoly.getPopup("broke");
        popup.find("#player-placeholder").text(player.attr("id"));
        Monopoly.showPopup("broke");
        popup.find("button").unbind("click").bind("click", function () {
            Monopoly.closeAndNextTurn();
        });
        Monopoly.showPopup("broke");
    }
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};


Monopoly.removePlayer = function (player) {
    player.addClass("broke").detach();
    $("#brokePlayers").append(player);
    var playerId = player.attr("id");
    setTimeout(function () {
        $(".game.cell." + playerId)
            .removeClass(playerId)
            .removeAttr("data-owner")
            .removeAttr("data-rent")
            .addClass("available");
    }, 500);


},

    Monopoly.rollDice = function () {
        var result1 = Math.floor(Math.random() * 6) + 1;
        var result2 = Math.floor(Math.random() * 6) + 1;
        $(".dice").find(".dice-dot").css("opacity", 0);
        $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1);
        $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
        var currentPlayer = Monopoly.getCurrentPlayer();
        if (result1 == result2) {
            Monopoly.doubleCounter++;
            if (Monopoly.doubleCounter === 3) {
                Monopoly.tripleDouble(currentPlayer);
            } else {
                Monopoly.doubleTurn = true;
                Monopoly.handleAction(currentPlayer, "move", result1 + result2);
            }
        } else {
            Monopoly.handleAction(currentPlayer, "move", result1 + result2);
        }
    };

Monopoly.tripleDouble = function (player) {
    Monopoly.handleAction(player, "jail");
    Monopoly.doubleCounter = 0;
    Monopoly.doubleTurn = false;
    Monopoly.setNextPlayerTurn();
},

    Monopoly.movePlayer = function (player, steps) {
        Monopoly.allowRoll = false;
        var playerMovementInterval = setInterval(function () {
            if (steps == 0) {
                clearInterval(playerMovementInterval);
                Monopoly.handleTurn(player);
            } else {
                console.log(player.attr("id"));
                var playerCell = Monopoly.getPlayersCell(player);
                console.log(playerCell);
                var nextCell = Monopoly.getNextCell(playerCell);
                nextCell.find(".content").append(player);
                steps--;
            }
        }, 200);
    };


Monopoly.handleTurn = function () {
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    player.removeClass("ownProperty");
    if (playerCell.is(".available.property")) {
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
    } else {
        if (playerCell.hasClass(player.attr("id"))) {
            player.addClass("ownProperty");
        }
        Monopoly.setNextPlayerTurn();


    }
}


Monopoly.setNextPlayerTurn = function () {
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
    var nextPlayerId;
    if (Monopoly.doubleTurn && (!currentPlayerTurn.is(".broke"))) {
        nextPlayerId = playerId;
        Monopoly.doubleTurn = false;
    } else {
        nextPlayerId = playerId + 1;
    }
    if (nextPlayerId > $(".player").length) {
        nextPlayerId = 1;
        Monopoly.doubleTurn = false;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".broke")) {
        Monopoly.setNextPlayerTurn();
        return;
    }
    if (nextPlayer.is(".jailed")) {
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time", currentJailTime);
        if (currentJailTime > 3) {
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};


Monopoly.handleBuyProperty = function (player, propertyCell) {
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) {
            Monopoly.handleBuy(player, propertyCell, propertyCost);
        } else {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function (player, propertyCell) {
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var properyOwner = $(".player#" + properyOwnerId);
        Monopoly.updatePlayersMoney(player, currentRent);
        Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
        Monopoly.closeAndNextTurn();
    });
    Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};


Monopoly.handleChanceCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};

Monopoly.handleCommunityCard = function (player) {
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (communityJson) {
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", communityJson["action"]).attr("data-amount", communityJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("community");
};


Monopoly.sendToJail = function (player) {
    player.addClass("jailed");
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};


Monopoly.getPopup = function (popupId) {
    return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculateProperyCost = function (propertyCell) {
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};


Monopoly.calculateProperyRent = function (propertyCost) {
    return propertyCost / 2;
};


Monopoly.closeAndNextTurn = function () {
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

Monopoly.initPopups = function () {
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};


Monopoly.handleBuy = function (player, propertyCell, propertyCost) {
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost) {
        Monopoly.showErrorMsg();
        Monopoly.playSound("shotgun");
    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);
        player.addClass("ownProperty");
        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        Monopoly.setNextPlayerTurn();
    }
};


Monopoly.handleAction = function (player, action, amount) {
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player, amount);
            if (player.is(".broke")) {
                return;
            }
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    }
    ;
    if (!player.is("broke")) {
        Monopoly.closePopup();
    }
}

;


Monopoly.createPlayers = function (numOfPlayers) {
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};


Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1;
    if (nextCellId > 40) {
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};


Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player, (-(Monopoly.moneyAtStart / 10)));
};


//Validates user's input for number of players. Minimum 2 players, maximum of 6.
Monopoly.isValidInput = function (validate, value) {
    var isValid = false;
    switch (validate) {
        case "numofplayers":
            if (value > 1 && value <= Monopoly.maxPlayers) {
                isValid = true;
            }

    }

    if (!isValid) {
        Monopoly.showErrorMsg();
    }
    return isValid;

}

//Displays error on the input popup at the beginning of the game for invalid input. Fades out after 2 seconds.
Monopoly.showErrorMsg = function () {
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};

//Sets height and width of the board according to window size.
// The sides of the board are always the min of  height and width minus the top margin of the board * 2.
Monopoly.adjustBoardSize = function () {
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({"height": boardSize, "width": boardSize});
}

Monopoly.closePopup = function () {
    $(".popup-lightbox").fadeOut();
};

//Creates Audio object and plays sound from sound file.
Monopoly.playSound = function (sound) {
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}

//Displays popup divs relevant to the on-board event which triggers them.
Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();