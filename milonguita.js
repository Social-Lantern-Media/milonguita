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

	Template.addPublication.helpers({
		showPubForm: function(){
			return Session.get("showPubForm");
		},
		isTypeMilonga: function(pubType){
			return pubType === "milonga" ? 'selected' : '';
		},
		isTypeEvent: function(pubType){
			return pubType === "event" ? 'selected' : '';
		},
		isTypePractica: function(pubType){
			return pubType === "practica" ? 'selected' : '';
		}
	});

	Template.editPublication.helpers({
		showEditPubForm: function(){
			return Session.get("showEditPubForm");
		},
		editInfo: function(){
			return Publications.findOne(Session.get("showEditPubFormId"));
		},
		isTypeMilonga: function(pubType){
			return pubType === "milonga" ? 'selected' : '';
		},
		isTypeEvent: function(pubType){
			return pubType === "event" ? 'selected' : '';
		},
		isTypePractica: function(pubType){
			return pubType === "practica" ? 'selected' : '';
		}
	});

	Template.body.events({
		
	});

	Template.publication.events({
		"click .delete": function(){
			Meteor.call("deletePublication", this._id);
		},
		"click .toggle-private": function(){
			Meteor.call("setPrivate", this._id, ! this.private);
		},
		"click .show-edit-pub-form": function(event){
			if (Session.get("showEditPubForm")){
				Session.set("showEditPubForm", false);
				Session.set("showEditPubFormId", "");
			}else{
				Session.set("showEditPubForm", true);
				Session.set("showEditPubFormId", this._id);
			}
		}
	});

	Template.addPublication.events({
		"submit .new-publication": function (event){
			// Prevent default browser form submit
			event.preventDefault();

			// Get values from form element
			var pub = { 'name': event.target.name.value,
							'type': event.target.type.value,
							'description': event.target.description.value,
							'address': event.target.address.value,
							'date': event.target.date.value,
							'cost': event.target.cost.value,
							'time': event.target.time.value,
							'fbLink': event.target.fbLink.value,
		 	};

			// Insert a publication into the collection
			Meteor.call("addPublication", pub);

			// Clear form
			event.target.name.value = "";
			event.target.description.value = "";
			event.target.address.value = "";
			event.target.date.value = "";
			event.target.cost.value = "";
			event.target.time.value = "";
			event.target.fbLink.value = "";

			// Hide form
			Session.set("showPubForm", false);

		},
		"click .show-pub-form": function(event){
			Session.get("showPubForm") ? Session.set("showPubForm", false) : Session.set("showPubForm", true);
		}
	});

	Template.editPublication.events({
		"submit .edit-publication": function(event){
			// Prevent default browser form submit
			event.preventDefault();

			// Get values from form element
			var newPub = { 'name': event.target.name.value,
							'type': event.target.type.value,
							'description': event.target.description.value,
							'address': event.target.address.value,
							'date': event.target.date.value,
							'cost': event.target.cost.value,
							'time': event.target.time.value,
							'fbLink': event.target.fbLink.value,
		 	};			

			// Update the publication
			Meteor.call("updatePublication", event.target.id.value, newPub);

			// Clear form
			event.target.name.value = "";
			event.target.type.value = "";
			event.target.description.value = "";
			event.target.address.value = "";
			event.target.date.value = "";
			event.target.cost.value = "";
			event.target.time.value = "";
			event.target.fbLink.value = "";

			// Hide form
			Session.set("showEditPubForm", false);
		}
	});

	// Client side validations 
	Template.addPublication.rendered = function () {
		// Initialize the date picker		
		$('#add-datepicker').datetimepicker({
								    inline: true,
								    format: 'MM/DD/YYYY'
								});
		// Make client-side validation available
		$('.new-publication').validate();
	};

	Template.editPublication.rendered = function (){
		// Initialize the date picker		
		$('#edit-datepicker').datetimepicker({
								    inline: true,
								    format: 'MM/DD/YYYY'
								});
		
		// Make client-side validation available
		$('.edit-publication').validate();
	};

	Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
	addPublication: function(pub){
		// Make sure the user is logged in before inserting a publication
		if (! Meteor.userId()){
			throw new Meteor.Error("not-authorized");
		}

		// Server-side validations 
		if (!this.isSimulation){
			// Check helpers
			NonEmptyString = Match.Where(function (x) {
				check(x, String);
				return x.length > 0;
			});

			UrlMatch = Match.Where(function (x) {
							 check(x, String);
							 var urlRegex = /^(https?):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

							 return urlRegex.test(x);
						  });
 
			// Check all the data received
			check(pub, {
				name: NonEmptyString,
				type: Match.Where(function(x){
							check(x, String);
							return x === "milonga" || x === "event" || x === "practica";
						}),
				description: NonEmptyString,
				address: NonEmptyString,
				date: Match.Where(function(x){
							var y = new Date(x);
							return Match.test(y, Date);
						}),
				cost: NonEmptyString,
				time: NonEmptyString,
				fbLink: UrlMatch
			});
		}	

		Publications.insert({
			name: pub['name'],
			type: pub['type'],
			createdAt: new Date(),
			description: pub['description'],
			address: pub['address'],
			date: new Date(pub['date']),
			cost: pub['cost'],
			time: pub['time'],
			fbLink: pub['fbLink'],
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
	updatePublication: function(pubId, newPub){
		var oldPub = Publications.findOne(pubId);

		if (oldPub.private && oldPub.owner !== Meteor.userId()){
			// If the publication is private, make sure only the owner can update it.
			throw new Meteor.Error("not-authorized");
		}
		
		// Server-side validations 
		if (!this.isSimulation){
			// Check helpers
			NonEmptyString = Match.Where(function (x) {
				check(x, String);
				return x.length > 0;
			});

			UrlMatch = Match.Where(function (x) {
							 check(x, String);
							 var urlRegex = /^(https?):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

							 return urlRegex.test(x);
						  });
 
			// Check all the data received
			check(newPub, {
				name: NonEmptyString,
				type: Match.Where(function(x){
							check(x, String);
							return x === "milonga" || x === "event" || x === "practica";
						}),
				description: NonEmptyString,
				address: NonEmptyString,
				date: Match.Where(function(x){
							var y = new Date(x);
							return Match.test(y, Date);
						}),
				cost: NonEmptyString,
				time: NonEmptyString,
				fbLink: UrlMatch
			});
		}	


		Publications.update(pubId, {$set: { name: newPub['name'],
														type: newPub['type'],
														description: newPub['description'],
														address: newPub['address'],
														date: new Date(newPub['date']),
														cost: newPub['cost'],
														time: newPub['time'],
														fbLink: newPub['fbLink']
													 } 
											}
		);
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
