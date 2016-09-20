import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
export const Stations = new Mongo.Collection('stations');


if (Meteor.isServer) {
    Meteor.publish('stations', function (selector) {
        return Stations.find(selector);
    });
}

Stations.allow({
    insert(userId, station) {
        return userId && station.owner === userId;
    },
    update(userId, station, fields, modifier) {
        if(Meteor.isServer)
            return true;
        
        return userId && (station.owner === userId || fields[0]==="reclamation");
    },
    /*
    remove(userId, party) {
      return userId && party.owner === userId;
    }*/
});