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
                if (a[fields[0]][fields[1]] > b[fields[0]][fields[1]])
                    return 1;
                else if (a[fields[0]][fields[1]] < b[fields[0]][fields[1]])
                    return -1;
                else {
                    if (a['distance']['value'] > b['distance']['value'])
                        return 1;
                    else if (a['distance']['value'] < b['distance']['value'])
                        return -1;
                    else
                        return 1;
                }
            });
            if (reverse) filtered.reverse();
            return filtered;
        };
    });