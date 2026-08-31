import dbStations from 'db-stations';
let res = [];
dbStations()
.on('data', (station) => {
  if (station.name.includes('Würzburg')) res.push(station);
})
.on('end', () => console.log(res.length));
