var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var logger = require("./logger.js").Logger;

var fs = require('fs');

/*
=====================
Functions
=====================
*/

function correctUsage(cmd) {
	var msg = "Usage: `" + config.mod_command_prefix + "" + cmd + " " + commands[cmd].usage + "`";
	return msg;
}

/*
=====================
Commands
=====================
*/

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix){
				var msgArray = [];
				msgArray.push("This is a list of commands. Use `" + config.mod_command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("");
				msgArray.push("**Commands: **");
				msgArray.push("```");
				Object.keys(commands).forEach(function(cmd){ msgArray.push("" + config.mod_command_prefix + "" + cmd + ": " + commands[cmd].desc + ""); });
				msgArray.push("```");
				bot.sendMessage(msg.author, msgArray);
			} else {
				if (commands.hasOwnProperty(suffix)){
					var msgArray = [];
					msgArray.push("**" + config.mod_command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage: **`" + config.mod_command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown: **" + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { msgArray.push("This command will delete the message that activates it"); }
					bot.sendMessage(msg.author, msgArray);
				} else { bot.sendMessage(msg.author, "Command `" + suffix + "` not found."); }
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "[-ls (list servers)] ",
		cooldown: 60,
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id || msg.author.id == msg.channel.server.owner.id) {
				fs.readFile("./logs/debug.txt", 'utf8', function (err, data) {
					if (err) { logger.log("warn", "Error getting debug logs: " + err); }
					logger.log("debug", "Fetched debug logs");
					data = data.split(/\r?\n/);
					var count = 0;
					for (line of data) {
						if (line.indexOf(" - debug: Command processed: ") != -1) { count += 1; }
					}
					var msgArray = [];
					msgArray.push("```");
					msgArray.push("Uptime: " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
					msgArray.push("Connected to " + bot.servers.length + " servers and " + bot.channels.length + " channels.");
					msgArray.push("Serving " + bot.users.length + " users.");
					msgArray.push("Username: " + bot.user.username);
					msgArray.push("Running BrussellBot v" + version);
					msgArray.push("Commands processed this session: " + count);
					msgArray.push("```");
					bot.sendMessage(msg, msgArray);
				});

				if (suffix.indexOf("-ls") != -1) {
					var svrArray = [];
					for (svrObj of bot.servers) { svrArray.push("`"+svrObj.name+": Channels: "+svrObj.channels.length+", Users: "+svrObj.members.length+"`"); }
					bot.sendMessage(msg, svrArray);
				}
			} else { bot.sendMessage(msg, "Only server owners can do this."); }
		}
	},
	"playing": {
		desc: "Set what the bot is playing. Leave empty for random.",
		usage: "[game]",
		cooldown: 5,
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
			if (msg.channel.server.owner.id == msg.author.id) {
				!suffix ? bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]) : bot.setPlayingGame(suffix);
				logger.log("info", "" + msg.author.username + " set the playing status to: " + suffix);
			} else { console.log("info", "Server owners only"); }
			}
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of bot messages 1-100>",
		cooldown: 10,
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (suffix && /[^0-9]/.test(suffix) == false) {
				if (msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
					bot.getChannelLogs(msg.channel, 100, function (error, messages) {
						if (error) {
							logger.log("warn", "Something went wrong while fetching logs.");
							return;
						} else {
							bot.startTyping(msg.channel);
							logger.log("debug", "Cleaning bot messages...");
							var todo = suffix,
							delcount = 0;
							for (msg1 of messages) {
								if (msg1.author === bot.user) {
									bot.deleteMessage(msg1);
									delcount++;
									todo--;
								}
								if (todo == 0) {
									logger.log("debug", "Done! Deleted " + delcount + " messages.");
									bot.stopTyping(msg.channel);
									return;
								}
							}
							bot.stopTyping(msg.channel);
						}
					});
				} else { bot.sendMessage(msg, "You must have permission to manage messages in this channel"); }
			} else { bot.sendMessage(msg, correctUsage("clean")); }
		}
	},
	"prune": {
		desc: "Cleans the specified number of messages from the channel.",
		usage: "<number of messages 1-100>",
		cooldown: 10,
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (suffix && /[^0-9]/.test(suffix) == false) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("manageMessages")) {
					if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
						bot.getChannelLogs(msg.channel, 100, function (error, messages) {
							if (error) {
								logger.log("warn", "Something went wrong while fetching logs.");
								return;
							} else {
								bot.startTyping(msg.channel);
								logger.log("debug", "Pruning messages...");
								var todo = parseInt(suffix);
								var delcount = 0;
								for (cMsg of messages) {
									bot.deleteMessage(cMsg);
									delcount++;
									todo--;
									if (todo == 0) {
										logger.log("debug", "Done! Deleted " + delcount + " messages.");
										bot.stopTyping(msg.channel);
										return;
									}
								}
								bot.stopTyping(msg.channel);
							}
						});
					} else { bot.sendMessage(msg, "I don't have permission to delete messages."); }
				} else { bot.sendMessage(msg, "You must have permission to manage messages in this channel"); }
			} else { bot.sendMessage(msg, correctUsage("prune")); }
		}
	},
	"leaves": {
		desc: "Leaves the server.",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") || msg.author.id == config.admin_id) {
					bot.sendMessage(msg, "It's not like I want to be here or anything, baka").then(
					bot.leaveServer(msg.channel.server));
					logger.log("info", "I've left a server on request of " + msg.sender.username + ". I'm only in " + bot.servers.length + " servers now.");
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! (You need permission to kick users in this channel)");
					logger.log("info", "A non-privileged user (" + msg.sender.username + ") tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, "I can't leave a DM."); }
		}
	},
	"announce": {
		desc: "Bot owner only",
		deleteCommand: true,
		usage: "<message>",
		cooldown: 30,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (msg.author.id == config.admin_id) {
					bot.servers.forEach(function (ser) {
						bot.sendMessage(ser.defaultChannel, suffix + " - " + msg.author);
					});
					logger.log("info", "Announced \"" + suffix + "\" to servers");
				} else { bot.sendMessage(msg, "Bot owner only!"); }
			}
		}
	}
}

exports.commands = commands;
