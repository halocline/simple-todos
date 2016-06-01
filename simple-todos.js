// simple-todos.js

Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks : function () {
      if ( Session.get("hide-completed") ) {
        // If hide completed is checked, filter tasks
        return Tasks.find( {checked : { $ne : true } }, { sort : { createdAt : -1 } });
      }
      else {
        return Tasks.find({}, { sort : { createdAt : -1 } });
      }
    },
    hideCompleted : function () {
      return Session.get("hideCompleted");
    },
    incompleteCount : function () {
      return Tasks.find( { checked : { $ne : true } } ).count();
    }
  });

  Template.body.events({
    "submit .new-task" : function (event) {
      console.log(event);
      var text = event.target.text.value;

      Meteor.call("addTask", text);

      // Clear the form
      event.target.text.value = "";

      // Prevent default form submit
      return false;
    },
    "change .hide-completed input" : function (event) {
      Session.set("hide-completed", event.target.checked);
    }
  });

  Template.task.events({
    "click .toggle-checked" : function () {
      // Toggle checked property's value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .toggle-private" : function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    },
    "click .delete" : function () {
      Meteor.call("deleteTask", this._id);
    }
  });

  Template.task.helpers({
    isOwner : function () {
      return this.owner === Meteor.userId();
    }
  });

  Accounts.ui.config({
    passwordSignupFields : "USERNAME_ONLY"
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.publish("tasks", function () {
    return Tasks.find({
      // Only publish tasks that are public or belong to owner
      $or : [
        { private : { $ne : true } },
        { owner : this.userId }
      ]
    });
  });
}

Meteor.methods({
  addTask : function (text) {
    // Ensure user is logged in before creating task
    if (! Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text : text,
      createdAt : new Date(),
      owner : Meteor.userId(),
      username : Meteor.user().username
    });
  },
  deleteTask : function (taskId) {
    var task = Tasks.findOne(taskId);

    // If task is private, ensure only owner can delete
    if (task.private && task.owner !== Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  setChecked : function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);

    // If task is private, ensure only owner can check
    if (task.private && task.owner !== Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set : { checked : setChecked } } );
  },
  setPrivate : function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Ensure only task owner can set to private
    if (task.owner !== Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set : { private : setToPrivate } } );
  }
});
