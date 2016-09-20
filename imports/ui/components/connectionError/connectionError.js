import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import { Meteor } from 'meteor/meteor';



import mobileTemplate from './mobile.html';
import webTemplate from './web.html';
import './connectionError.css';

class ConnectionError {
    constructor($scope, $reactive, $timeout) {
        'ngInject';

        $reactive(this).attach($scope);
        var vm = this;
        
        vm.helpers({
            connection() {
                return Meteor.status();
            }
        });

    }

}


const name = 'connectionError';
const template = Meteor.isCordova ? mobileTemplate : webTemplate;
// create a module
export default angular.module(name, [
    angularMeteor,
]).component(name, {
    template,
    controllerAs: name,
    controller: ConnectionError,
}).config(config);
function config($stateProvider, $locationProvider, $urlRouterProvider) {
    'ngInject';

    $stateProvider
        .state('connectionError', {
            url: '/connectionError',
            template: '<connection-error></connection-error>'
        })
}