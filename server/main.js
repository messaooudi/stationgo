import { Meteor } from 'meteor/meteor';
import { Stations } from '../imports/api/stations';

Meteor.startup(() => {
    Meteor.methods({
        // Declaring a method
        getData: function (origin, destination) {
            this.unblock();
            return Meteor.http.get("https://maps.googleapis.com/maps/api/directions/json?origin=" + origin + "&destination=" + destination + "&key=AIzaSyCopGumk0XmliwO-0dOdo974glwHXu_S2U");
        }
    });

    Meteor.methods({
        geocod: function (origin) {
            //this.unblock();
            return Meteor.http.get("https://maps.googleapis.com/maps/api/geocode/json?language=fr&latlng=" + origin + "&key=AIzaSyCopGumk0XmliwO-0dOdo974glwHXu_S2U")
        }
    });
    Meteor.methods({
        getDistance: function (origin, destination) {
            this.unblock();
            //return Meteor.http.call('GET', 'http://router.project-osrm.org/route/v1/driving/13.388860,52.517037;13.397634,52.529407;13.428555,52.523219?overview=false')
            return Meteor.http.call('GET', 'https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&language=fr&origins=' + origin + '&destinations=' + destination + '&key=AIzaSyCopGumk0XmliwO-0dOdo974glwHXu_S2U', { timeout: 6000 })
            
        }
    });
    Meteor.methods({
        stationRec: function (id) {
            this.unblock();
            return Stations.aggregate({ $project: { reclamation: { $filter: { input: "$reclamation", as: "rec", cond: { $eq: ["$$rec.vue", false] } } } } }, { $match: { _id: id } });
        }
    })
    Meteor.methods({
        updateRec: function (id) {
            Stations.update({ _id: id, "reclamation.vue": false }, { $set: { "reclamation.$.vue": true } })
        }
    })
    Meteor.methods({
        updateUserLikes: function (station_id, n) {
            let obj = {};
            obj["profile.likes." + station_id] = n;
            Meteor.users.update({ _id: Meteor.user()._id }, { $set: obj });
        }
    })

});
