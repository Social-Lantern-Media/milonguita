Publications = new Mongo.Collection("publications");

if (Meteor.isServer){
	// Only publish publications that are public or belong to the current user
	Meteor.publish("publications", function(){
		return Publications.find({
			$or: [
				{ private: {$ne: true} },
				{ owner: this.userId }
			]
		});
	});
}

if (Meteor.isClient) {
	Meteor.subscribe("publications");
	
	Template.body.helpers({
		publications: function (){
			// Show newest publications at the top
			return Publications.find({}, {sort: {createdAt: -1}});
		}
	});

	Template.publication.helpers({
		isOwner: function(){
			return this.owner === Meteor.userId();
		}
	});

	Template.body.events({
		"submit .new-publication": function (event){
			// Prevent default browser form submit
			event.preventDefault();

			// Get value from form element
			var name = event.target.text.value;

			// Insert a publication into the collection
			Meteor.call("addPublication", name);

			// Clear form
			event.target.text.value = "";
		}
	});

	Template.publication.events({
		"click .toggle-checked": function(){
			// Set the checked property to the opposite of its current value
			var newName = "newName"			
			Meteor.call("updatePublication", this._id, newName);
		},
		"click .delete": function(){
			Meteor.call("deletePublication", this._id);
		},
		"click .toggle-private": function(){
			Meteor.call("setPrivate", this._id, ! this.private);
		}
	});

	Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
	addPublication: function(name){
		// Make sure the user is logged in before inserting a publication
		if (! Meteor.userId()){
			throw new Meteor.Error("not-authorized");
		}

		Publications.insert({
			name: name,
			createdAt: new Date(),
			owner: Meteor.userId(),
			username: Meteor.user().username
		});
	},
	deletePublication: function(pubId){
		var pub = Publications.findOne(pubId);
		if (pub.private && pub.owner !== Meteor.userId()){
			// If the publication is private, make sure only the owner can delete it
			throw new Meteor.Error("not-authorized");
		}

		Publications.remove(pubId);
	},
	updatePublication: function(pubId, newName){
		var pub = Publications.findOne(pubId);
		if (pub.private && pub.owner !== Meteor.userId()){
			// If the publication is private, make sure only the owner can update it.
			throw new Meteor.Error("not-authorized");
		}

		Publications.update(pubId, {$set: { name: newName } });
	},
	setPrivate: function(pubId, setToPrivate){
		var publication = Publications.findOne(pubId);

		// Make sure only the task owner can make a publication private
		if (publication.owner !== Meteor.userId()){
			throw new Meteor.Error("not-authorized");
		}

		Publications.update(pubId, { $set: { private: setToPrivate } });
	}
});

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
