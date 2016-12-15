/* global L */
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import 'leaflet-routing-machine';


import 'angularjs-slider/dist/rzslider.min.js';
import 'angularjs-slider/dist/rzslider.min.css'

import './customMarkers/leaflet.awesome-markers.min.js'
import './customMarkers/leaflet.awesome-markers.css'

import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker'
import { Stations } from '../../../api/stations';
import { globaleGramma } from '../../../api/voiceGramma';

import mobileTemplate from './mobile.html';
import webTemplate from './web.html';
import './gMap.css';


import { name as OrderStations } from '../../filters/orderStations';


class GMap {
    constructor($scope, $reactive, $state, orderByFilter, orderStationsFilter, $timeout) {
        'ngInject';

        $reactive(this).attach($scope);

        var vm = this;
        vm.lastPosition;


        var homeIcon = L.AwesomeMarkers.icon({
            icon: 'fa-street-view',
            markerColor: 'red',
        });
        var defaultIcon = L.AwesomeMarkers.icon({
            icon: 'fa-car',
            markerColor: 'blue',
        });
        vm.currentMarker = L.marker([], { icon: homeIcon, zIndexOffset: 95 });

        vm.markers = [];
        vm.markers['null'] = L.marker();
        vm.boundsLayer = L.featureGroup([]);//L.latLngBounds([]);
        function hideMarkers(opacity) {
            for (let i = 0; i < vm.markers.length; i++) {
                vm.markers[i].setOpacity(opacity)
                vm.markers[i].removeEventListener('click')
                vm.markers[i].closePopup();
            }
        }
        function showMarkers() {
            for (let i = 0; i < vm.markers.length; i++) {
                vm.markers[i].setOpacity(1)
                vm.markers[i].on('click', markerClickHandler)
            }
        }

        function markerClickHandler(e) {
            e.target.unbindPopup()
            let content = $('#info-window-panel');
            $(document).on("click", "#editButton", () => {
                vm.markers[vm.station._id].closePopup()
                $scope.$apply(() => {
                    vm.stationList.edit(e.target.station)
                })
            })
            $(document).on("click", "#goButton", () => {
                vm.markers[vm.station._id].closePopup()
                $scope.$apply(() => {
                    vm.direction.station = e.target.station;
                    vm.direction.show();
                })
            })
            $scope.$apply(() => {
                vm.station = e.target.station;
                setTimeout(() => {
                    e.target.bindPopup(content.html()).togglePopup()
                }, 100)
            })

        }

        vm.station = {};
        var button = $('<div>').html('<button class="btn btn-primary">Ajouter</button>');
        var newStationPopUp = L.popup().setContent(button[0]);
        function mapClickHandler(e) {
            map.setView(e.latlng, 16);
            newStationPopUp.setLatLng(e.latlng)
            newStationPopUp.openOn(map)
            vm.addStation.e = e;
            //alert(e.latlng)
        }



        //initiailer la map avec la position actuel
        L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';
        var map = L.map('mapid', { zoomControl: false });
        //map.spin(true);
        var routing = {};
        var osrmBackEnd = {}

        vm.helpers({
            current() {
                let pos = Location.getReactivePosition() || Location.getLastPosition() || { latitude: 0, longitude: 0 };
                vm.currentMarker.setLatLng([pos.latitude, pos.longitude]);
                vm.currentMarker.update();
                if (vm.direction && vm.direction._show) {
                    routing.spliceWaypoints(0, 1, L.latLng(pos.latitude, pos.longitude))
                    map.panTo(L.latLng(pos.latitude, pos.longitude))
                }
                return pos;
            }
        });

        vm.lastPosition = vm.current;

        let oldSegmentIndex = 100000;
        map.once('load', () => {
            L.control.zoom({
                position: 'topright'
            }).addTo(map);
            vm.currentMarker.addTo(map)

            osrmBackEnd = L.Routing.osrmv1({useHints: false });//serviceUrl: 'http://127.0.0.1:5000/route/v1', useHints: false });

            routing = L.Routing.control({
                router: osrmBackEnd,
                waypoints: [],
                show: false,
                draggableWaypoints: false,
                addWaypoints: false,
                fitSelectedRoutes: false,
                showAlternatives: true,
                lineOptions: { styles: [{ color: 'black', opacity: 0.15, weight: 9 }, { color: 'white', opacity: 0.8, weight: 6 }, { color: 'blue', opacity: 1, weight: 3 }] },
                altLineOptions: { styles: [{ color: 'black', opacity: 0.15, weight: 9 }, { color: 'white', opacity: 0.8, weight: 6 }, { color: 'red', opacity: 0.9, weight: 2 }] }
            });

            routing.on('routeselected', function (e) {
                //var coord = e.route.coordinates;
                var instr = e.route.instructions;

                var formatter = new L.Routing.Formatter({ language: 'fr' });

                $scope.$apply(() => {
                    vm.direction.text = formatter.formatInstruction(instr[(instr.length < 3) ? 1 : 0]) + " (" + formatter.formatDistance(instr[0].distance) + ")";
                })
                if (instr[0].index != oldSegmentIndex) {
                    if (Meteor.isCordova) {
                        TTS.speak({
                            text: formatter.formatInstruction(instr[(instr.length < 3) ? 1 : 0]),
                            locale: 'fr-FR',
                            rate: 1
                        }, function () {
                            // alert('success');
                        }, function (reason) {
                            alert(reason);
                        });
                    }
                }
                oldSegmentIndex = instr[0].index
            });

            routing.addTo(map);
            routing.hide();
            routing.on('routesfound', (e) => {
                $scope.$apply(() => {
                    vm.direction.summary.totalDistance = e.routes[0].summary.totalDistance / 1000 > 1 ? (e.routes[0].summary.totalDistance / 1000).toFixed(2) + " Km" : (e.routes[0].summary.totalDistance).toFixed(1) + " Métres";
                    let duration = new Date(e.routes[0].summary.totalTime * 1000);
                    let hh = duration.getUTCHours();
                    let mm = duration.getUTCMinutes();
                    let ss = duration.getSeconds();
                    vm.direction.summary.totalTime = (hh > 0 ? hh + " heurs et " : "") + (mm > 0 ? mm + " minutes" : "") + ((hh == 0 && mm == 0) ? ss + " secondes." : ".");
                })
            })



        }).setView([vm.current.latitude, vm.current.longitude], 13);
        L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWVzc2FvdWRpb3Vzc2FtYSIsImEiOiJjaXQ2MjBqdHQwMDFsMnhxYW9hOW9tcHZoIn0.uX-ZR_To6tzxUpXmaVKOnQ', {
        }).addTo(map);


        vm.helpers({
            user() {
                return Meteor.user()
            }
        })


        vm._stations = {};
        vm._sortedStations = [];


        //partie radius Panel,
        vm.radiusPanel = {
            dep: new Tracker.Dependency,
            _show: false,
            radius: Meteor.user().profile.radius,
            options: {
                floor: 400,
                ceil: 30000,
                showSelectionBar: true,
                getSelectionBarColor: function (value) {

                    vm.radiusPanel.circle.setRadius(value);
                    map.fitBounds(vm.radiusPanel.circle.getBounds())

                    if (value <= 5000) {
                        vm.radiusPanel.circle.setStyle({ color: 'red' })
                        return 'red';
                    }
                    if (value <= 15000) {
                        vm.radiusPanel.circle.setStyle({ color: 'orange' })
                        return 'orange';
                    }
                    if (value <= 25000) {
                        vm.radiusPanel.circle.setStyle({ color: 'blue' })
                        return 'blue';
                    }
                    vm.radiusPanel.circle.setStyle({ color: 'green' })
                    return 'green';
                },
                translate: function (value) {
                    if (value / 1000 > 1)
                        return (value / 1000).toFixed(2) + "Km"

                    return value + "Métres";
                }
            },
            circle: {},
            setRadius: function (newVal) {
                this.radius = newVal;
                this.dep.changed();
            },
            getRadius: function () {
                this.dep.depend();
                return this.radius;
            },
            show: function (station) {
                this.circle = L.circle([vm.current.latitude, vm.current.longitude], this.radius);
                this.circle.addTo(map);
                map.fitBounds(this.circle.getBounds())
                this._show = true;
                vm.stationListTrigger.hide();
                $timeout(function () {
                    $scope.$broadcast('rzSliderForceRender');
                });
            },
            hide: function () {
                map.removeLayer(this.circle);
                this.circle = {};
                this._show = false;
                vm.stationListTrigger.show();
            },
            submitRadius: function () {
                this.dep.changed();
                this.hide();
                //map.fitBounds(vm.boundsLayer.getBounds())
                Meteor.users.update({ _id: Meteor.user()._id }, { $set: { 'profile.radius': this.radius } });
            }
        }

        //Partie sideBar 
        vm.sideBarTrigger = {
            _show: true,

            click: function () {
                vm.sideBarPanel.toggle();
            },
            show: function () {
                this._show = true;
            },
            hide: function () {
                this._show = false;
            }
        }

        vm.sideBarPanel = {
            dep: new Tracker.Dependency,
            _show: false,
            _showOwnerStations: false,
            getShowOwnerStations: function () {
                this.dep.depend();
                return this._showOwnerStations;
            },
            showOwnerStations: function () {
                this._showOwnerStations = true;
                this.dep.changed();
                this.hide();
                //map.fitBounds(vm.boundsLayer.getBounds())
            },
            hideOwnerStations: function () {
                this._showOwnerStations = false;
                this.dep.changed();
                //map.fitBounds(vm.boundsLayer.getBounds())
            },
            toggle: function () {
                this._show = !this._show;

                if (this._show) {
                    vm.mapShadow.show();
                } else {
                    vm.mapShadow.hide();
                }
            },
            show: function () {
                this._show = true;
            },
            hide: function () {
                this._show = false;
                vm.mapShadow.hide();
            },

            addStationTrigger: function () {
                this.hide();
                vm.addStation.show();
            },
            logOutTrigger: function () {
                Meteor.logout(function (error) {
                    if (error)
                        alert(error)
                })
            },
            settingsTrigger: function () {
                this.hide();
                vm.settingsPanel.show()
                vm.mapShadow.show();
            }
        }


        //partie settings

        vm.settingsPanel = {
            dep: new Tracker.Dependency,
            _show: false,
            orderBy: Meteor.user().profile.orderBy,
            showCloseStation: Meteor.user().profile.showCloseStation,
            showNoEssence: Meteor.user().profile.showNoEssence,
            showNoGasoil: Meteor.user().profile.showNoGasoil,

            setOrderBy: function (orderBy) {
                if (this.orderBy.value !== orderBy.value) {
                    this.orderBy = orderBy;
                    this.dep.changed();
                    Meteor.users.update({ _id: Meteor.user()._id }, { $set: { 'profile.orderBy': orderBy } });

                    vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(defaultIcon);
                    vm._sortedStations = orderStationsFilter(vm._stations, orderBy.value)

                    let icon = L.AwesomeMarkers.icon({
                        icon: orderBy.value == 'distance.value' ? 'fa-clock-o' : 'fa-money',
                        markerColor: 'orange',
                        spin: true
                    });
                    vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(icon);
                }
            },
            getOrderBy: function () {
                this.dep.depend();
                return this.orderBy
            },

            setShowCloseStation: function (newVal) {
                if (this.showCloseStation !== newVal) {
                    this.showCloseStation = newVal;
                    this.dep.changed();
                    Meteor.users.update({ _id: Meteor.user()._id }, { $set: { 'profile.showCloseStation': newVal } });
                }
            },
            getShowCloseStation: function () {
                this.dep.depend();
                return this.showCloseStation;
            },

            setShowNoEssence: function (newVal) {
                if (this.showNoEssence !== newVal) {
                    this.showNoEssence = newVal;
                    this.dep.changed();
                    Meteor.users.update({ _id: Meteor.user()._id }, { $set: { 'profile.showNoEssence': newVal } });
                }
            },
            getShowNoEssence: function () {
                this.dep.depend();
                return this.showNoEssence;
            },

            setShowNoGasoil: function (newVal) {
                if (this.showNoGasoil !== newVal) {
                    this.showNoGasoil = newVal;
                    this.dep.changed();
                    Meteor.users.update({ _id: Meteor.user()._id }, { $set: { 'profile.showNoGasoil': newVal } });
                }
            },
            getShowNoGasoil: function () {
                this.dep.depend();
                return this.showNoGasoil;
            },

            toggle: function () {
                this._show = !this._show;

                if (this._show) {
                    vm.mapShadow.show();
                } else {
                    vm.mapShadow.hide();
                }
            },
            show: function () {
                this._show = true;
            },
            hide: function () {
                this._show = false;
                vm.mapShadow.hide();
            },
            radiusTrigger: function () {
                vm.radiusPanel.show();
                this.hide();
            }

        }



        vm.helpers({
            firstStationIcon() {
                return L.AwesomeMarkers.icon({
                    icon: vm.settingsPanel.getOrderBy().value == 'distance.value' ? 'fa-clock-o' : 'fa-money',
                    markerColor: 'orange',
                    spin: true
                });
            }
        })


        Tracker.autorun(() => {
            var origin = vm.getReactively('current');
            var distance = 0;
            if (origin && vm.lastPosition) {
                distance = L.latLng(origin.latitude, origin.longitude).distanceTo(L.latLng(vm.lastPosition.latitude, vm.lastPosition.longitude));
            }
            if (distance > 100) {
                let count = 0;
                for (let id in vm._stations) {
                    vm._stations[id].updateDistance(() => {
                        count++;
                        if (vm.stations.length == count) {
                            $scope.$apply(() => {
                                vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(90);
                                vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(defaultIcon);
                                vm._sortedStations = orderStationsFilter(vm._stations, vm.settingsPanel.getOrderBy().value)
                                vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(vm.firstStationIcon);
                                vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(100);
                            })
                        }
                    })
                }
            }
            vm.lastPosition = origin;
        })

        Tracker.autorun(() => {
            let pos = vm.getReactively('current');//vm.current;
            let bounds = { center: [pos.longitude, pos.latitude], radius: 0.000621371 * vm.radiusPanel.getRadius() };

            if (vm.sideBarPanel.getShowOwnerStations()) {
                Meteor.subscribe('stations', { "owner": Meteor.user()._id });
            } else {
                let selector = [{ cord: { $geoWithin: { $centerSphere: [bounds.center, bounds.radius / 3963.2] } } }];

                if (!vm.settingsPanel.getShowCloseStation())
                    selector.push({ "open": { $eq: true } });
                if (!vm.settingsPanel.getShowNoEssence())
                    selector.push({ $or: [{ "essence.dispo": { $eq: true } }, { "gasoil.dispo": { $eq: true } }] });
                if (!vm.settingsPanel.getShowNoGasoil())
                    selector.push({ $or: [{ "gasoil.dispo": { $eq: true } }, { "essence.dispo": { $eq: true } }] });

                Meteor.subscribe('stations', { $and: selector });

            }
        })




        //utile 

        function getDistance(origin, dest, callback) {
            let waypoints = [{ latLng: origin }, { latLng: dest }];
            osrmBackEnd.route(waypoints, function (err, routes) {
                let formatter = new L.Routing.Formatter({ language: 'fr' });
                if (err)
                    callback(err, { text: "", value: "" }, { text: "", value: "" })
                else {
                    callback(err,
                        { text: formatter.formatDistance(routes[0].summary.totalDistance), value: routes[0].summary.totalDistance },
                        { text: formatter.formatTime(routes[0].summary.totalTime), value: routes[0].summary.totalTime })
                }
            });

        }
        function getOrigins(stations, max) {
            let i = 0;
            let j = 0;
            let _tmp = [];
            angular.forEach(stations, function (station, index) {
                if (j == 0)
                    _tmp[i] = '';

                _tmp[i] += ((j == 0) ? '' : '|') + station.cord.lat + ',' + station.cord.lng;
                j++;

                if (j == max) {
                    j = 0;
                    i++;
                }
            })

            return { dest: _tmp, max: max };
        }

        //station object
        function Station() {
            this.nom = '',
                this.number = '',
                this.address = '',
                this.cord = { lat: '', lng: '' },
                this.distance = { text: '', value: '', estimated: 0 },
                this.duration = { text: '', value: '' },
                this.gasoil = { dispo: false, prix: 0 },
                this.essence = { dispo: false, prix: 0 },
                this.open = true,
                this.reclamation = [],
                this.likes = 0,
                this.like = 0;
            this.owner = Meteor.user()._id;
        }



        //partie Map shadow 
        vm.mapShadow = {
            _show: false,

            click: function () {
                if (vm.sideBarPanel._show) {
                    vm.sideBarPanel.hide()
                    this.hide();
                }
            },

            hide: function () {
                this._show = false;
            },
            show: function () {
                this._show = true;
            }
        }


        //current position trigger
        vm.currentPositionTrigger = {
            _show: true,

            click: function () {
                map.panTo(L.latLng(vm.current.latitude, vm.current.longitude))
            },
            show: function () {
                this._show = true;
            },
            hide: function () {
                this._show = false;
            }
        }

        //partie add Station
        vm.addStation = {
            _show: false,
            mode: '', //'picker' pour choisir les coordonnées dans la carte , 'info' pour saisir les info    

            station: new Station(),

            e: {}, //click map event object

            show: function () {
                this._show = true;
                this.mode = 'picker';
                vm.stationListTrigger.hide();

                hideMarkers(0.4);
                map.on('click', mapClickHandler);
            },
            hide: function () {
                this._show = false;
                this.mode = '';
                vm.stationListTrigger.show();
                vm.mapShadow.hide();

                this.station = new Station();

                showMarkers()
                map.removeEventListener('click')
                map.closePopup()
            },

            submit: function () {
                Stations.insert(this.station);
                this.hide();
                //map.fitBounds(vm.boundsLayer.getBounds())

            },

            hiddenButtonClick: function () {
                map.removeEventListener('click')
                map.closePopup()

                Meteor.call('geocod', [vm.addStation.e.latlng.lat, vm.addStation.e.latlng.lng], function (error, response) {
                    if (error) {
                        return;
                    }
                    var data = JSON.parse(response.content);
                    if (data.results[0].formatted_address) {
                        vm.addStation.station.address = data.results[0].formatted_address;
                    }
                })

                vm.addStation.station.cord = { lng: vm.addStation.e.latlng.lng, lat: vm.addStation.e.latlng.lat };
                $scope.$apply(() => {
                    vm.mapShadow.show();
                    vm.addStation.mode = 'info';
                })
            }
        }

        button.on('click', vm.addStation.hiddenButtonClick)

        //partie stations List
        vm.stationListTrigger = {
            _show: true,

            loading: false,
            click: function () {
                vm.stationList.toggle();
            },
            show: function () {
                this._show = true;
            },
            hide: function () {
                this._show = false;
            }
        }

        vm.stationList = {
            _show: false,
            search: { nom: '' },
            globaleLikes: 1,
            blockRating: false,
            oldLike: 0,
            setLike: function (station, n) {
                if (!this.blockRating) {
                    var tmp = n - station.like;
                    Meteor.call('updateUserLikes', station._id, n, function (err, data) {
                    })
                    Stations.update(station._id, { $inc: { likes: tmp } }, function (error, n) {
                    })

                    vm._stations[station._id].like = n;
                    station.like = n;
                }
            },
            toggle: function () {
                this._show = !this._show;

                if (this._show) {
                    vm.mapShadow.show();
                } else {
                    vm.mapShadow.hide();
                }
            },
            show: function () {
                this._show = true;
            },
            hide: function () {
                this._show = false;
                this.search = { nom: '' };
                vm.mapShadow.hide();
            },
            edit: function (station) {
                if (vm.markers[vm.station._id])
                    vm.markers[vm.station._id].closePopup()

                this.hide();
                vm.editStation.show(station)
            },
            go: function (station) {
                vm.direction.station = station;
                vm.direction.show();

                if (vm.markers[vm.station._id])
                    vm.markers[vm.station._id].closePopup()

                this.hide();
            },
            reclamer: function (station) {
                this.hide();
                vm.reclamerPanel.show(station);
            },
            showReclamations: function (station) {
                this.hide();
                vm.reclamationsPanel.show(station);
            }
        }
        //Partie Réclamation

        vm.reclamerPanel = {
            _show: false,
            station: {},
            message: "",
            show: function (station) {
                this._show = true;
                this.station = station,
                    vm.mapShadow.show();
            },
            hide: function () {
                this._show = false;
                vm.mapShadow.hide();
                this.station = {};
                this.message = "";
            },
            submit: function () {
                Stations.update(this.station._id, {
                    $push: {
                        reclamation: {
                            sender:
                            {
                                nom: Meteor.user().profile.lastName,
                                prenom: Meteor.user().profile.firstName,
                                email: Meteor.user().emails[0].address,
                            },
                            date: new Date(),
                            message: this.message,
                            vue: false
                        }
                    }
                })
                this.hide();
            }
        }


        vm.reclamationsPanel = {
            _show: false,
            station: {},
            show: function (station) {
                this._show = true;
                this.station = station,
                    vm.mapShadow.show();
            },
            hide: function () {
                this._show = false;

                Stations.update(this.station._id, { $set: { reclamation: [] } });

                /*for(let i = 0 ; i < this.station.reclamation.length ; i++){
                     Meteor.call('updateRec',this.station._id,function(err,data){})
                }*/
                this.station = {};
                vm.mapShadow.hide();
            },
        }

        //Partie direction


        vm.direction = {
            _show: false,
            text: '',
            station: {},
            summary: { totalDistance: "0 Métre", totalTime: "0 s" },
            show: function () {
                routing.setWaypoints([
                    L.latLng(vm.current.latitude, vm.current.longitude),
                    L.latLng(this.station.cord.lat, this.station.cord.lng)
                ])
                hideMarkers(0.3);
                map.setView(L.latLng(vm.current.latitude, vm.current.longitude), 16)
                vm.stationListTrigger.hide();
                vm.currentPositionTrigger.hide();
                this._show = true;
            },
            hide: function () {
                this._show = false;
                vm.stationListTrigger.show();
                vm.currentPositionTrigger.show();
                this.summary = { totalDistance: "0 Métre", totalTime: "0 s" };
                showMarkers();
                //map.fitBounds(vm.boundsLayer.getBounds());
                routing.setWaypoints([]);
            }
        }


        //partie edit station
        vm.editStation = {
            _show: false,
            station: {},
            toggle: function () {
                this._show = !this._show;

                if (this._show) {
                    vm.mapShadow.show();
                } else {
                    vm.mapShadow.hide();
                }
            },
            show: function (station) {
                this.station = station;
                vm.mapShadow.show();
                this._show = true;
            },
            hide: function () {
                this._show = false;
                this.station = new Station();
                vm.mapShadow.hide();
            },
            submit: function () {
                this.station.gasoil.prix = Number(this.station.gasoil.prix);
                this.station.essence.prix = Number(this.station.essence.prix);
                Stations.update(this.station._id, {
                    $set: {
                        gasoil: this.station.gasoil,
                        essence: this.station.essence,
                        open: this.station.open
                    },
                })
                this.hide();
            }
        }



        vm.stationHandler;
        vm.helpers({
            stations() {
                let query = Stations.find({});
                let count = 0;
                vm.stationHandler = query.observeChanges({
                    added: function (id, station) {
                        vm.loadingCube.setShow(true);

                        station._id = id;

                        vm.markers[id] = L.marker([station.cord.lat, station.cord.lng], {icon : defaultIcon, zIndexOffset: 90 });
                        vm.markers[id].addTo(map);
                        vm.markers[id].station = station;
                        vm.markers[id].on('click', markerClickHandler)
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(defaultIcon);

                        vm._stations[id] = station;
                        vm._stations[id].like = Meteor.user().profile.likes[id] ? Meteor.user().profile.likes[id] : 0;
                        vm._stations[id].updateDistance = function (callback) {
                            getDistance(L.latLng(vm.current.latitude, vm.current.longitude), L.latLng(this.cord.lat, this.cord.lng),
                                (err, distance, duration) => {
                                    this.distance = distance;
                                    this.duration = duration;
                                    callback();
                                });
                        }

                        vm._stations[id].updateDistance(() => {
                            count++;
                            if (query.count() == count) {
                                vm.loadingCube.setShow(false);
                                $scope.$apply(() => {
                                    vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(90);
                                    vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(defaultIcon);
                                    vm._sortedStations = orderStationsFilter(vm._stations, vm.settingsPanel.getOrderBy().value)
                                    vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(vm.firstStationIcon);
                                    vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(100);
                                })
                            }
                        })


                        vm.stationList.globaleLikes += station.likes;

                    },
                    changed: function (id, station) {
                        for (var property in station) {
                            if (property == 'likes')
                                vm.stationList.globaleLikes += station.likes - vm._stations[id]['likes'];

                            vm._stations[id][property] = station[property]
                        }

                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(90);
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(defaultIcon);
                        vm._sortedStations = orderStationsFilter(vm._stations, vm.settingsPanel.getOrderBy().value)
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(vm.firstStationIcon);
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(100);
                    },
                    removed: function (id) {
                        count--;
                        map.removeLayer(vm.markers[id]);
                        vm.stationList.globaleLikes -= vm._stations[id]["likes"];
                        vm._stations[id] = undefined;

                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(90);
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(defaultIcon);
                        vm._sortedStations = orderStationsFilter(vm._stations, vm.settingsPanel.getOrderBy().value)
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setIcon(vm.firstStationIcon);
                        vm.markers[vm._sortedStations[0] ? vm._sortedStations[0]._id : 'null'].setZIndexOffset(100);
                        vm.markers[id] = undefined;
                    }
                })
                return query;
            }
        });


        vm.connectionToast = {
            _show: false,
            text: '',
            setShow: function (val, message) {
                this._show = val;
                this.text = message;
            },
            setText: function (text) {
                this.text = text
            }
        }


        Tracker.autorun(() => {
            vm.connectionToast.setShow(!Meteor.status().connected, 'Verifier votre connection ... ')
        })

        vm.loadingCube = {
            _show: false,
            setShow: function (val) {
                this._show = val;
            },
        }



        vm.audioTrigger = {
            _show: false,
            setShow: function (val) {
                this._show = val;
            },
            startRecognition: function () {
                if (Meteor.isCordova) {
                    TTS.speak({
                        text: "que puis-je faire pour vous, " + Meteor.user().profile.lastName,
                        locale: 'fr-FR',
                        rate: 1
                    }, function () {
                        startVoiceRecognition();
                    }, function (reason) {
                        startVoiceRecognition();
                    });
                }
            }
        }

        function voiceIs(scenario, text) {
            let gramma = globaleGramma()[scenario];
            let isTrue = false;
            for (let i = 0; i < gramma.length; i++) {
                for (let j = 0; j < gramma[i].length; j++) {
                    isTrue = isTrue || text.includes(gramma[i][j]);
                    if (isTrue)
                        break;
                }
                if (!isTrue)
                    return false;

                isTrue = false;
            }
            return true;
        }

        function voiceIsNearestStation(text) {
            let stationGramma = ['station', 'stations'];
            let itineraireGramma = ['itinéraire', 'chemin', 'trajet'];
            let procheGramma = ['proche'];
            let gramma = [stationGramma, itineraireGramma, procheGramma];
            let isTrue = false;
            for (let i = 0; i < gramma.length; i++) {
                for (let j = 0; j < gramma[i].length; j++) {
                    isTrue = isTrue || text.includes(gramma[i][j]);
                    if (isTrue)
                        break;
                }
                if (!isTrue)
                    return false;

                isTrue = false;
            }
            return true;
        }


        function startVoiceRecognition() {
            var recognition = new SpeechRecognition();
            recognition.lang = 'fr-FR';
            recognition.start();
            recognition.onresult = function (event) {
                if (event.results.length > 0) {
                    let text = event.results[0][0].transcript;
                    if (voiceIs('showNearest', text)) {
                        let station = orderStationsFilter(vm._stations, 'distance.value')[0];
                        vm.sideBarPanel.hide();
                        TTS.speak({
                            text: "la station la plus proche est : " + station.nom + ". distance actuel  " + station.distance.text,
                            locale: 'fr-FR',
                            rate: 1
                        }, function () {
                            // alert('success');
                            vm.stationList.go(station);
                        }, function (reason) {
                            alert(reason);
                        });

                    } else if (voiceIs('showCheapestGasoil', text)) {
                        let station = orderStationsFilter(vm._stations, 'gasoil.prix')[0];
                        vm.sideBarPanel.hide();
                        TTS.speak({
                            text: "station " + station.nom + ", prix d'essence est, " + station.gasoil.prix + " Dihram",
                            locale: 'fr-FR',
                            rate: 1
                        }, function () {
                            // alert('success');
                            vm.stationList.go(station);
                        }, function (reason) {
                            alert(reason);
                        });
                    } else if (voiceIs('showCheapestEssence', text)) {
                        let station = orderStationsFilter(vm._stations, 'essence.prix')[0];
                        vm.sideBarPanel.hide();
                        TTS.speak({
                            text: "station " + station.nom + ", prix d'essence est, " + station.essence.prix + " Dihram",
                            locale: 'fr-FR',
                            rate: 1
                        }, function () {
                            // alert('success');
                            vm.stationList.go(station);
                        }, function (reason) {
                            alert(reason);
                        });
                    } else if (voiceIs('infoCheapestGasoil', text)) {
                        vm.sideBarPanel.hide();
                        let station = orderStationsFilter(vm._stations, 'gasoil.prix')[0];
                        TTS.speak({
                            text: "le prix le moin cher est " + station.gasoil.prix + " Dirham, chez la station : " + station.nom,
                            locale: 'fr-FR',
                            rate: 1
                        }, function () {
                            // alert('success');

                        }, function (reason) {
                            alert(reason);
                        });
                    } else if (voiceIs('infoCheapestEssence', text)) {
                        vm.sideBarPanel.hide();
                        let station = orderStationsFilter(vm._stations, 'essence.prix')[0];
                        TTS.speak({
                            text: "le prix le moin cher est " + station.gasoil.prix + " Dirham, chez la station : " + station.nom,
                            locale: 'fr-FR',
                            rate: 1
                        }, function () {
                            // alert('success');

                        }, function (reason) {
                            alert(reason);
                        });
                    } else if (text.includes('masquer') && text.includes('station') && text.includes('fermer')) {
                        vm.settingsPanel.setShowCloseStation(false)
                    }
                } else {
                    alert('vide')
                }
            };
        }



    }
}

const name = 'gMap';
const template = Meteor.isCordova ? mobileTemplate : webTemplate;

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    OrderStations,
    'rzModule'//Slider Module
]).component(name, {
    template,
    controllerAs: name,
    controller: GMap,
}).config(config);
function config($stateProvider, $locationProvider, $urlRouterProvider) {
    'ngInject';

    $stateProvider
        .state('app', {
            url: '/app',
            template: '<g-map></g-map>',
            resolve: {
                currentUser($q) {
                    if (Meteor.user() === null) {
                        return $q.reject();
                    } else {
                        return $q.resolve();
                    }
                }
            }
        })
}