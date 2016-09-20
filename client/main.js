import angular from 'angular';
import { Meteor } from 'meteor/meteor';

import './font-awesome/css/font-awesome.min.css'
 
import { name as MainApp } from '../imports/ui/components/mainApp/mainApp';

function onReady() {
  angular.bootstrap(document, [
    MainApp
  ], {
    strictDi: true
  });
}
 
if (Meteor.isCordova) {
  angular.element(document).on('deviceready', onReady);
} else {
  angular.element(document).ready(onReady);
}