Publications = new Mongo.Collection("publications");

// Dont allow users to update their 'profile' value.
Meteor.users.deny({update: function () { return true; }});

if (Meteor.isServer){
	Meteor.publish("publications", function(weekNumber){
		// Check that weekNumber is valid (between 0 and 3).
		validWeek = Match.Where(function(x){
			check(x, Number);
			return x >= 0 && x <= 3;
		});
		check(weekNumber, validWeek);

		// Only return the publications for the specified week
		var startDate = moment().add(Number(weekNumber)*7, 'days').startOf('day');
		var endDate = moment(startDate);
		endDate.add(6, 'days').endOf('day');		

		return Publications.find({
						date:{
							$gte:startDate.toDate(),
							$lt:endDate.toDate()
						}
					});
	});

	// Add a profile object to all the users being created.
	Accounts.onCreateUser(function(options, user){
		user.profile = options.profile ? options.profile : { admin: false };
		return user;
	}); 
}

if (Meteor.isClient) {

	// Define a global handle for the subscription, this way it's possible to keep in the
	// minimongo only the data of the requested week.
	//  This handle is used in 'Template.daysOfWeek.helpers -> day function'.
	// If I want to keep all the publications at all times, just need to get rid
	// of the handler and the stop() function it uses. 	
	var subscriptionHandle;
	subscriptionHandle = Meteor.subscribe("publications", Number(Session.get('weekNumber')));
	
	Template.body.helpers({
		publications: function (){
			// Show newest publications at the top
			return Publications.find({}, {sort: {createdAt: -1}});
		},
		showEditPubForm: function (){
			return Session.get('showEditPubForm');
		},
		existsPreviousWeek: function (){
			return Session.get('weekNumber') != 0;
		},
		existsNextWeek: function (){
			return Session.get('weekNumber') != 3;
		},
		showPubInfo: function(){
			return Session.get('showPubInfo');
		}
	});

	Template.infoPublication.helpers({
		pubInfo: function(){
			return Publications.findOne(Session.get('showPubInfoId'));
		}
	});

	Template.publication.helpers({
		isOwnerOrAdmin: function(){
			return (this.owner === Meteor.userId() || (Meteor.user() != null && Meteor.user().profile.admin));
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

	Template.daysOfWeek.helpers({
		nameOfDay: function(numOfDay){
			return moment().add(numOfDay + 7*Session.get('weekNumber'), 'days').startOf('day').format('dddd');
		},
		numberOfDate: function(numOfDay){
			return moment().add(numOfDay + 7*Session.get('weekNumber'), 'days').startOf('day').format('D, MMM');
		},
		day: function(numOfDay){
			var startDate = moment().add(numOfDay + 7*Session.get('weekNumber'), 'days').startOf('day');
			var endDate = moment(startDate).endOf('day');

			// If a subscription to 'publications' already existed, stop it
			if (subscriptionHandle){
				subscriptionHandle.stop();
			}			

			subscriptionHandle = Meteor.subscribe("publications", Number(Session.get('weekNumber')));

			return Publications.find({
								date:{
									$gte: startDate.toDate(),
									$lt: endDate.toDate()		
								}			
						});
		}
	});

	Template.body.events({
		"click .previous-week": function(event){
			event.preventDefault();
			var weekNumber = Session.get('weekNumber');
			
			// Check that the weekNumber is valid (between 0 and 3).
			validWeek = Match.Where(function(x){
				check(x, Number);
				return x >= 0 && x <= 3;
			});
			check(weekNumber-1, validWeek); 

			Session.set('weekNumber', weekNumber-1);
		},
		"click .next-week": function(event){
			event.preventDefault();
			var weekNumber = Session.get('weekNumber');
			
			// Check that the weekNumber is valid (between 0 and 3).
			validWeek = Match.Where(function(x){
				check(x, Number);
				return x >= 0 && x <= 3;
			});
			check(weekNumber+1, validWeek);

			Session.set('weekNumber', weekNumber+1);
		}		
	});

	Template.infoPublication.events({
		"click .close-info-pub": function(event){
			event.preventDefault();

			Session.set('showPubInfo', false);
			Session.set('showPubInfoId', '');
		}
	});

	Template.publication.events({
		"click .delete": function(){
			Meteor.call("deletePublication", this._id);
		},
		"click .show-edit-pub-form": function(event){
			if (Session.get("showEditPubForm")){
				Session.set("showEditPubForm", false);
				Session.set("showEditPubFormId", "");
			}else{
				Session.set("showEditPubForm", true);
				Session.set("showEditPubFormId", this._id);
			}
		},
		"click .pub-info": function(event){
			event.preventDefault();

			Session.set('showPubInfo', true);
			Session.set('showPubInfoId', this._id);
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

		// Select today as minDate
		$('#add-datepicker').data('DateTimePicker').minDate(new Date());

		// Make client-side validation available
		$('.new-publication').validate();
	};

	Template.editPublication.rendered = function (){
		// Initialize the date picker		
		$('#edit-datepicker').datetimepicker({
								    inline: true,
								    format: 'MM/DD/YYYY'
								});

		// Select today as minDate
		$('#add-datepicker').data('DateTimePicker').minDate(new Date());

		// Get the publication to be edited, and put the date in the datepicker
		var oldPubId = Session.get('showEditPubFormId');
		var oldPublication = Publications.findOne({ _id: oldPubId }); 
		$('#edit-datepicker').data("DateTimePicker").date(new Date(oldPublication.date));

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
							return Match.test(y, Date) && y >= new Date();
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
		
		// Make sure only the owner or admin can delete it
		if (pub.owner !== Meteor.userId() && (Meteor.user() != null && !Meteor.user().profile.admin)){
			throw new Meteor.Error("not-authorized");
		}

		Publications.remove(pubId);
	},
	updatePublication: function(pubId, newPub){
		var oldPub = Publications.findOne(pubId);

		// Make sure only the owner or admin can update it.
		if (oldPub.owner !== Meteor.userId() && (Meteor.user() != null && !Meteor.user().profile.admin)){
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
	}
});

if (Meteor.isClient){
	Meteor.startup(function(){
		Session.set('weekNumber', 0);
	});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
		// Create admin user on startup.
		// Since users cant update their profile, they cant become admins.
		if ( Meteor.users.find().count() === 0 ) {
			 Accounts.createUser({
				  username: 'tiago',
				  email: 'tiago@admin.com',
				  password: 'thiago',
				  profile: {
						admin: true
				  }
			 });
		}
  });
}
