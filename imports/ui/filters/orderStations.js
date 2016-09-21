import angular from 'angular';

const name = 'orderStations';
 
// create a module
export default angular.module(name, [])
    .filter(name, () => {
        return function (items, field, reverse) {
            var filtered = [];
            var fields = field.split('.')
            angular.forEach(items, function (item) {
                filtered.push(item);
            });
            filtered.sort(function (a, b) {
                if(fields[0]=="essence"){
                    if(a.essence.dispo&&a.open&&(!b.essence.dispo||!b.open))
                        return -1;
                    else if((!a.essence.dispo||!a.open)&&b.essence.dispo&&b.open)
                        return 1;
                    else{
                        if(a.essence.prix > b.essence.prix)
                            return 1;
                        else if(a.essence.prix < b.essence.prix)
                            return -1
                        else{
                            if(a.distance.value > b.distance.value)
                                return 1;
                            else if(a.distance.value < b.distance.value)  
                                return -1;
                            else {
                                if(a.likes > b.likes)
                                    return -1
                                 else
                                    return 1
                            }
                        }
                    }
                }
                else if(fields[0]=="gasoil"){
                    if(a.gasoil.dispo&&a.open&&(!b.gasoil.dispo||!b.open))
                        return -1;
                    else if((!a.gasoil.dispo||!a.open)&&b.gasoil.dispo&&b.open)
                        return 1;
                    else{
                        if(a.gasoil.prix > b.gasoil.prix)
                            return 1;
                        else if(a.gasoil.prix < b.gasoil.prix)
                            return -1
                        else{
                            if(a.distance.value > b.distance.value)
                                return 1;
                            else if(a.distance.value < b.distance.value)  
                                return -1;
                            else {
                                if(a.likes > b.likes)
                                    return -1
                                 else
                                    return 1
                            }
                        }
                    }
                }else{
                    if(a.open&&!b.open)
                        return -1;
                    else if(!a.open&&b.open)
                        return 1;
                    else{
                         if(a.distance.value > b.distance.value)
                                return 1;
                            else if(a.distance.value < b.distance.value)  
                                return -1;
                            else {
                                if(a.likes > b.likes)
                                    return -1
                                 else
                                    return 1
                            }
                    }
                }
            });
            if (reverse) filtered.reverse();
            return filtered;
        };
    });