/* global google */
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker'

import { name as Gmap } from '../gMap/gMap';
import { name as Login } from '../login/login';
import { name as ConnectionError } from '../connectionError/connectionError';


import webTemplate from './web.html';
import mobileTemplate from './mobile.html';



class MainApp {
    constructor($scope, $reactive, $state) {
        'ngInject';
        $reactive(this).attach($scope);
        var vm = this;
        Tracker.autorun(() => {
            if (!Meteor.status().connected&&!Meteor.user()) {
                $state.go('connectionError');
            } else {
                if (Meteor.user())
                    $state.go('app');
                else if (!$state.includes('login')) {
                    $state.go('login');
                }
            }
        })
        
        Meteor.startup(() => {
            //Location.enableDistanceFilter(1)

            Location.getGPSState(function (state) {
                if (state === 'Enabled') {
                } else {
                }
            }, function () {
            }, { dialog: true })


            Location.startWatching(function (pos) {
            }, function (err) {
                //alert("Oops! There was an error" + JSON.stringify(err));
            });
        })

    }
}

const name = 'mainApp';
const template = Meteor.isCordova ? mobileTemplate : webTemplate;

//create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    Gmap,
    Login,
    ConnectionError
]).component(name, {
    template,
    controllerAs: name,
    controller: MainApp
}).config(config);
function config($locationProvider, $urlRouterProvider) {
    'ngInject';
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/login');
}
