// Collection that hold all the publications.
Publications = new Mongo.Collection("publications");

// The name of the facebook user that will officiate as Admin.
// This name should be in an ENV variable, change it!
var ADMIN_NAME = "Tiago Páez";

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
		var startDate = moment.utc().utcOffset("-03:00").add(Number(weekNumber)*7, 'days').startOf('day');
		var endDate = moment.utc(startDate).utcOffset("-03:00");
		endDate.add(6, 'days').endOf('day');		

		return Publications.find({
						date:{
							$gte:startDate.toDate(),
							$lt:endDate.toDate()
						}
					}, {sort: {upvoteCount: -1}});
	});

	// This makes the services.facebook fields available on the user object.
	Meteor.publish('userData', function(){
		return Meteor.users.find({}, {
			fields: {'services.facebook': 1}
		});
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

	Meteor.subscribe("userData");
	
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
		},
		isAdmin: function(){
			return Meteor.user() != null && Meteor.user().profile.name == ADMIN_NAME;
		}
	});

	Template.infoPublication.helpers({
		pubInfo: function(){
			return Publications.findOne(Session.get('showPubInfoId'));
		},
		isEmptyFBFriendsUpvoted: function(){
			return Session.get("profile_pics") == undefined;
		},
		numFBFriendsUpvoted: function(){
			return Session.get("num_profile_pics");
		},
		getFBFriendsUpvoted: function(){
			return Session.get("profile_pics");
		}
	});

	Template.publication.helpers({
		isOwnerOrAdmin: function(){
			return (this.owner === Meteor.userId() || (Meteor.user() != null && Meteor.user().profile.name == ADMIN_NAME));
		},
		canUpvote: function(){
			// This helper checks if this user is already in the list of upvoters for this publication.
			for (var i = 0; i < this.upvotes.length; i++){
				if (this.upvotes[i].upvoterId === Meteor.userId()){
					return false;
				}
			}
			return true;
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
			return moment.utc().utcOffset("-03:00").add(numOfDay + 7*Session.get('weekNumber'), 'days').startOf('day').format('dddd');
		},
		numberOfDate: function(numOfDay){
			return moment.utc().utcOffset("-03:00").add(numOfDay + 7*Session.get('weekNumber'), 'days').startOf('day').format('D, MMM');
		},
		day: function(numOfDay){
			var startDate = moment.utc().utcOffset("-03:00").add(numOfDay + 7*Session.get('weekNumber'), 'days').startOf('day');
			var endDate = moment.utc(startDate).utcOffset("-03:00").endOf('day');

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
		},
		"click .delete-old-pubs": function(event){
			event.preventDefault();

			// Delete all the old publications.
			Meteor.call("deleteOldPublications", function(err, res){
				if (err){
					console.log(err);
				}

				console.log(res);
			});

		}		
	});

	Template.loginFB.events({
		'click #facebook-login': function(event){
			event.preventDefault();
			Meteor.loginWithFacebook({ requestPermissions: ['public_profile', 'user_friends'] }, function(err){
				if (err){
					throw new Meteor.Error("Facebook Login failed!");
				}
			});
		},
		'click #logout': function(event){
			event.preventDefault();
			Meteor.logout(function(err){
				if (err){
					throw new Meteor.Error("Logout failed!");
				}
			});
		}
	});

	Template.infoPublication.events({
		"click .close-info-pub": function(event){
			event.preventDefault();

			Session.set('showPubInfo', false);
			Session.set('showPubInfoId', '');

			delete Session.keys.profile_pics;
			delete Session.keys.num_profile_pics;
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

			if (Meteor.user()){
				Meteor.call("getFBFriends", Session.get('showPubInfoId'), function(err, res){				
					if (err){
						console.log({error: err});
					}else{
						Session.set("profile_pics", res);
						Session.set("num_profile_pics", res.length);
					}
				});				
			}
		},
		"click .upvote":function(event){
			event.preventDefault();

			Meteor.call("upvotePublication", this._id);
		},
		"click .cancel-upvote":function(event){
			event.preventDefault();

			Meteor.call("cancelUpvotePublication", this._id);
		}
	});

	Template.addPublication.events({
		"change input[type='file']": function(e){
			// Check if the value in the input is an image, if it is make the request to Cloudinary.
			var form_validator = $('.new-publication').validate({
											rules: {
												photo_add: {
													accept: "image/*",
													extension: "png|jpe?g|gif"
												}
											}
										});			

			if (form_validator.element("#photo_add")){
				files = e.currentTarget.files;
	
				Cloudinary.upload(files,{
					folder:"secret",
					resource_type: "image"
					}, function(err,res){
							if (err == null){
								Session.set("pub_pic_id", res.public_id);
							}else{
								// Cloudinary returned error.
								console.log("not an image!");
							}
						}
				);	
			}
		},
		"submit .new-publication": function (event){
			// Prevent default browser form submit
			event.preventDefault();

			// Get pic public_id from Session and delete it
			var pic_public_id = Session.get("pub_pic_id");
			Session.set("pub_pic_id", "");
			delete Session.keys.pub_pic_id;

			// Get values from form element
			var pub = { 'name': event.target.name.value,
							'type': event.target.type.value,
							'description': event.target.description.value,
							'address': event.target.address.value,
							'date': event.target.date.value,
							'cost': event.target.cost.value,
							'time': event.target.time.value,
							'fbLink': event.target.fbLink.value,
							'picPublicId': pic_public_id,
							'keepPublication': event.target.keepPublication.checked
		 	};

			// Insert a publication into the collection
			Meteor.call("addPublication", pub);

			// Clear form
			event.target.name.value = "";
			event.target.description.value = "";
			event.target.address.value = "";
			event.target.date.value = "";
			$('#add-datepicker').data('DateTimePicker').clear();
			event.target.cost.value = "";
			event.target.time.value = "";
			event.target.fbLink.value = "";
			event.target.photo_add.value = "";
			event.target.keepPublication.checked = false;

			// Hide form
			Session.set("showPubForm", false);

		},
		"click .show-pub-form": function(event){
			Session.get("showPubForm") ? Session.set("showPubForm", false) : Session.set("showPubForm", true);
		}
	});

	Template.editPublication.events({
		"change input[type='file']": function(e){
			// Check if the value in the input is an image, if it is make the request to Cloudinary.
			var form_validator = $('.edit-publication').validate({
											rules: {
												photo_edit: {
													accept: "image/*",
													extension: "png|jpe?g|gif"
												}
											}
										});			

			if (form_validator.element("#photo_edit")){
				files = e.currentTarget.files;
	
				Cloudinary.upload(files,{
					folder:"secret",
					resource_type: "image"
					}, function(err,res){
							if (err == null){
								Session.set("pub_pic_id", res.public_id);
							}else{
								// Cloudinary returned error.
								console.log("Not an image!");
							}
						}
				);	
			}
		},		
		"submit .edit-publication": function(event){
			// Prevent default browser form submit
			event.preventDefault();
			
			// Get pic public_id from Session and delete it
			var pic_public_id = Session.get("pub_pic_id");
			Session.set("pub_pic_id", "");
			delete Session.keys.pub_pic_id;

			// Get values from form element
			var newPub = { 'name': event.target.name.value,
							'type': event.target.type.value,
							'description': event.target.description.value,
							'address': event.target.address.value,
							'date': event.target.date.value,
							'cost': event.target.cost.value,
							'time': event.target.time.value,
							'fbLink': event.target.fbLink.value,
							'picPublicId': pic_public_id,
		 	};			

			// Update the publication
			Meteor.call("updatePublication", event.target.id.value, newPub);

			// Clear form
			event.target.name.value = "";
			event.target.description.value = "";
			event.target.address.value = "";
			event.target.date.value = "";
			$('#add-datepicker').data('DateTimePicker').clear();
			event.target.cost.value = "";
			event.target.time.value = "";
			event.target.fbLink.value = "";
			event.target.photo_edit.value = "";

			// Hide form
			Session.set("showEditPubForm", false);
			Session.set("showEditPubFormId", '');
		}
	});

	// Client side validations 
	Template.addPublication.rendered = function () {
		// Initialize the date picker		
		$('#add-datepicker').datetimepicker({
								    inline: true,
								    format: 'MM/DD/YYYY',
									 useCurrent: false
								});

		// Select today as minDate
		$('#add-datepicker').data('DateTimePicker').minDate(moment.utc().utcOffset("-03:00").toDate());

		// Make client-side validation available
		$('.new-publication').validate({
			rules: {
				photo_add: {
					accept: "image/*",
					extension: "png|jpe?g|gif"
				}
			}
		});
	};

	Template.editPublication.rendered = function (){
		// Initialize the date picker		
		$('#edit-datepicker').datetimepicker({
								    inline: true,
								    format: 'MM/DD/YYYY'
								});

		// Select today as minDate
		$('#add-datepicker').data('DateTimePicker').minDate(moment.utc().utcOffset("-03:00").toDate());

		// Get the publication to be edited.
		var oldPubId = Session.get('showEditPubFormId');
		var oldPublication = Publications.findOne({ _id: oldPubId }); 
		// Put the date in the date picker.
		$('#edit-datepicker').data("DateTimePicker").date(moment.utc(oldPublication.date).utcOffset("-03:00").toDate());
		// Put the current image in the Session variable
		Session.set("pub_pic_id", oldPublication.picPublicId);

		// Make client-side validation available
		$('.edit-publication').validate({
			rules: {
				photo_edit: {
					accept: "image/*",
					extension: "png|jpe?g|gif"
				}
			}
		});
	};
}

if (Meteor.isServer){
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

				CloudinaryPublicIdMatch = Match.Where(function (x){
													check(x, String);
													var regex = /^secret\//;
													return regex.test(x);
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
								return Match.test(y, Date) && y >= moment.utc().utcOffset("-03:00").startOf('day').toDate();
							}),
					cost: NonEmptyString,
					time: NonEmptyString,
					fbLink: UrlMatch,
					picPublicId: CloudinaryPublicIdMatch,
					keepPublication: Match.Where(function(x){return Match.test(x, Boolean);})
				});
			}	

			Publications.insert({
				name: pub['name'],
				type: pub['type'],
				createdAt: moment.utc().utcOffset("-03:00").toDate(),
				description: pub['description'],
				address: pub['address'],
				date: moment.utc(new Date(pub['date'])).endOf('day').toDate(),
				cost: pub['cost'],
				time: pub['time'],
				fbLink: pub['fbLink'],
				picPublicId: pub['picPublicId'],
				upvotes: [],
				upvoteCount: 0,
				keepPublication: pub['keepPublication'],
				owner: Meteor.userId(),
				username: Meteor.user().profile.name
			});

			// If the user wants to keep the publication, then add publications for the next month.
			if (pub['keepPublication']){
				// Insert the publication for the next month.
				for(var i=1; i<=3; i++){
					Publications.insert({
						name: pub['name'],
						type: pub['type'],
						createdAt: moment.utc().utcOffset("-03:00").toDate(),
						description: pub['description'],
						address: pub['address'],
						date: moment.utc(new Date(pub['date'])).utcOffset("-03:00").add(7*i, 'days').toDate(),
						cost: pub['cost'],
						time: pub['time'],
						fbLink: pub['fbLink'],
						picPublicId: pub['picPublicId'],
						upvotes: [],
						upvoteCount: 0,
						keepPublication: pub['keepPublication'],
						owner: Meteor.userId(),
						username: Meteor.user().profile.name
					});
				};
			}
		},
		deletePublication: function(pubId){
			var pub = Publications.findOne(pubId);
		
			// Make sure only the owner or admin can delete it
			if (pub.owner !== Meteor.userId() && (Meteor.user() != null && !Meteor.user().profile.name == ADMIN_NAME)){
				throw new Meteor.Error("not-authorized");
			}

			Publications.remove(pubId);
		},
		updatePublication: function(pubId, newPub){
			var oldPub = Publications.findOne(pubId);

			// Make sure only the owner or admin can update it.
			if (oldPub.owner !== Meteor.userId() && (Meteor.user() != null && !Meteor.user().profile.name == ADMIN_NAME)){
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

				CloudinaryPublicIdMatch = Match.Where(function (x){
													check(x, String);
													var regex = /^secret\//;
													return regex.test(x);
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
								return Match.test(y, Date) && y >= moment.utc().utcOffset("-03:00").startOf('day').toDate();
							}),
					cost: NonEmptyString,
					time: NonEmptyString,
					fbLink: UrlMatch,
					picPublicId: CloudinaryPublicIdMatch
				});
			}	


			Publications.update(pubId, {$set: { name: newPub['name'],
															type: newPub['type'],
															description: newPub['description'],
															address: newPub['address'],
															date: new Date(newPub['date']),
															cost: newPub['cost'],
															time: newPub['time'],
															fbLink: newPub['fbLink'],
															picPublicId: newPub['picPublicId']
														 } 
												}
			);
		},
		deleteOldPublications: function(){
			// Check if the user is admin
			if (Meteor.user() != null && !Meteor.user().profile.name == ADMIN_NAME){
				throw new Meteor.Error("not-authorized");
			}

			var yesterday = moment.utc().utcOffset("-03:00").subtract(1, 'day').endOf('day');
			var oldPubs = Publications.find({
								date: { $lt: yesterday.toDate() }
							  }).fetch();
			return oldPubs;
		},
		upvotePublication: function(pubId){
			// Check if there is a logged in user.
			if (Meteor.user() == null){
				throw new Meteor.Error("not-authorized");
			}

			// Get the publication
			var pub = Publications.findOne(pubId);

			// Get the upvoter's id and name
			var upId = Meteor.userId();
			var upName = Meteor.user().profile.name;

			// Add the current user to the list of upvoters of this publication.
			Publications.update({name: pub.name}, {$push: {upvotes: {upvoterId: upId, upvoterName: upName}}, $inc: {upvoteCount: 1}}, {multi: true});
		},
		cancelUpvotePublication: function(pubId){
			// Check if there is a logged in user.
			if (Meteor.user() == null){
				throw new Meteor.Error("not-authorized");
			}

			// Get the publication
			var pub = Publications.findOne(pubId);

			// Get the upvoter's id and name
			var upId = Meteor.userId();
			var upName = Meteor.user().profile.name;

			// Remove the current user from the list of upvoters of this publication.
			Publications.update({name: pub.name}, {$pull: {upvotes: {upvoterId: upId, upvoterName: upName}}, $inc: {upvoteCount: -1}}, {multi: true});
		},
		getFBAccessToken: function(){
			try{
				return Meteor.user().services.facebook.accessToken;
			}catch(e){
				return null;
			}
		},
		getFBFriends: function(pubId){
			this.unblock();

			var apiCall = function(apiUrl, callback){
				try{
					var response = HTTP.get(apiUrl).data;
					callback(null, response);
				}catch(error){
					if (error.response){
						var errorCode = error.response.data.code;
						var errorMessage = error.response.data.message;
					}else{
						var errorCode = 500;
						var errorMessage = "Cannot access the APIIII";
					}
					var myError = new Meteor.Error(errorCode, errorMessage);
					callback(myError, null);
				}
			}

			// Get the current user friend list.
			var apiUrl = 'https://graph.facebook.com/v2.5/me/friends?access_token=' + Meteor.user().services.facebook.accessToken;
			console.log(apiUrl);			

			var apiCallAsync = Meteor.wrapAsync(apiCall);
			var response = apiCallAsync(apiUrl);
			
			var intersection = [];
			if (response){
				// Get all the upvotes.
				var pub = Publications.findOne(pubId);
				var upvotes = pub.upvotes;
				for (i = 0; i < upvotes.length; i++){
					var user = Meteor.users.findOne(upvotes[i].upvoterId);
					for (j = 0; j < response.data.length; j++){
						if (user.services.facebook.id == response.data[j].id){
							intersection.push(user);
						}
					}
				}
			}

			// intersection has now the users that are friends of the current user and upvoted this pub.
			// For every user in intersection, get the url of its profile pic.
			var profile_pics = [];
			for (i = 0; i < intersection.length; i++){
							var profilePicApiUrl = 'https://graph.facebook.com/v2.5/me/picture?redirect=false&access_token='+ intersection[i].services.facebook.accessToken;
							var profile_pic_res = apiCallAsync(profilePicApiUrl);
							profile_pics.push({
														url:profile_pic_res.data.url,
														name: intersection[i].services.facebook.name
													});
			}
			
			return profile_pics;
		}
	});
}

// Cloudinary
if (Meteor.isServer){
	Cloudinary.config({
		// Use ENV variables.
		cloud_name: 'dxrlmnw4s',
		api_key: '591251777449945',
		api_secret: 'LZ1m4KZUPXdVZrMfBRD8PgtcesI'});
}

if (Meteor.isClient){
	$.cloudinary.config({
		cloud_name:"dxrlmnw4s"});
}

// Start Up Client
if (Meteor.isClient){
	Meteor.startup(function(){
		Session.set('weekNumber', 0);
	});
}

// Start Up Server
if (Meteor.isServer) {
  Meteor.startup(function () {
		ServiceConfiguration.configurations.upsert(
			{service: "facebook"},
			{$set: {
				appId: "1064352450294793",
				secret: "0a6301cdc0f092e70637675c68bc952f",
				requestPermissions: ['user_friends']}
			}
		);
  });
}

if (Meteor.isClient){
	}
