import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import { Tracker } from 'meteor/tracker'
import { Accounts } from 'meteor/accounts-base'
import { Meteor } from 'meteor/meteor';



import mobileTemplate from './mobile.html';
import webTemplate from './web.html';
import './login.css';

class Settings {
    constructor($scope, $reactive, $timeout) {
        'ngInject';

        $reactive(this).attach($scope);
        var vm = this;

        document.addEventListener("backbutton", onBackButtonDown, false);

        function onBackButtonDown(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        vm.emailNotFound = false;
        vm.passwordNotFound = false;

        vm.emailTaken = false;

        vm.singIn = {
            userName: '',
            password: ''
        }

        vm.singUp = {
            userName: '',
            firstName: '',
            lastName: '',
            password: ''
        }

        vm.login = function () {
            Meteor.loginWithPassword(vm.singIn.userName, vm.singIn.password, function (error) {
                if (error) {
                    if (error.reason == 'User not found') {
                        vm.emailNotFound = true;
                        $timeout(function () {
                            vm.emailNotFound = false;
                        }, 4000)
                    }
                    if (error.reason == 'Incorrect password') {
                        vm.passwordNotFound = true;
                        $timeout(function () {
                            vm.passwordNotFound = false;
                        }, 4000)
                    }
                }
            })
        }

        vm.createUser = function () {
            Accounts.createUser({
                email: vm.singUp.userName,
                password: vm.singUp.password,
                profile: {
                    firstName: vm.singUp.firstName,
                    lastName: vm.singUp.lastName,
                    orderBy: {
                        text: 'distance',
                        value: 'distance.value'
                    },
                    radius: 25000,
                    showCloseStation : false,
                    showNoGasoil: true,
                    showNoEssence: true,
                    likes : {}
                }
            }, function (err) {
                if (err) {
                    if (err.reason == "Email already exists.") {
                        vm.emailTaken = true;
                        $timeout(function () {
                            vm.emailTaken = false;
                        }, 4000)
                    }
                }
            });
        }
        
         vm.connectionToast = {
            _show: false,
            setShow: function (val) {
                this._show = val;
            },
        }


        Tracker.autorun(() => {
            vm.connectionToast.setShow(!Meteor.status().connected)
        })

    }

}


const name = 'login';
const template = Meteor.isCordova ? mobileTemplate : webTemplate;
// create a module
export default angular.module(name, [
    angularMeteor,
]).component(name, {
    template,
    controllerAs: name,
    controller: Settings,
}).config(config);
function config($stateProvider, $locationProvider, $urlRouterProvider) {
    'ngInject';

    $stateProvider
        .state('login', {
            url: '/login',
            template: '<login></login>',
        })
}