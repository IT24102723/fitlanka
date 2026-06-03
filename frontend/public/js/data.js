var districtCities = {
  'Colombo': ['Colombo','Dehiwala-Mount Lavinia','Moratuwa','Sri Jayawardenepura Kotte','Maharagama','Nugegoda','Battaramulla','Rajagiriya','Boralesgamuwa','Kesbewa'],
  'Gampaha': ['Gampaha','Negombo','Wattala','Kadawatha','Ja-Ela','Minuwangoda','Kiribathgoda','Ragama','Kandana'],
  'Kalutara': ['Kalutara','Panadura','Horana','Beruwala','Aluthgama','Bandaragama'],
  'Kandy': ['Kandy','Peradeniya','Nawalapitiya','Gampola','Wattegama','Teldeniya'],
  'Matale': ['Matale','Dambulla','Sigiriya','Rattota'],
  'Nuwara Eliya': ['Nuwara Eliya','Hatton','Talawakele','Ginigathena'],
  'Galle': ['Galle','Ambalangoda','Bentota','Hikkaduwa'],
  'Matara': ['Matara','Weligama','Dikwella','Hakmana','Akuressa'],
  'Hambantota': ['Hambantota','Tangalle','Beliatta','Tissamaharama'],
  'Jaffna': ['Jaffna','Chavakachcheri','Point Pedro','Nallur'],
  'Kilinochchi': ['Kilinochchi','Pallai','Paranthan'],
  'Mannar': ['Mannar','Pesalai','Murunkan'],
  'Mullaitivu': ['Mullaitivu','Puthukkudiyiruppu','Oddusuddan'],
  'Vavuniya': ['Vavuniya','Sasthrikovil','Rambaikulam'],
  'Puttalam': ['Puttalam','Chilaw','Wennappuwa','Lunuwila'],
  'Kurunegala': ['Kurunegala','Kuliyapitiya','Narammala','Nikaveratiya','Polgahawela'],
  'Anuradhapura': ['Anuradhapura','Mihintale','Kebithigollewa','Medawachchiya'],
  'Polonnaruwa': ['Polonnaruwa','Kaduruwela','Hingurakgoda'],
  'Badulla': ['Badulla','Bandarawela','Welimada','Haputale','Passara'],
  'Moneragala': ['Moneragala','Bibile','Wellawaya'],
  'Ratnapura': ['Ratnapura','Balangoda','Kuruwita','Eheliyagoda'],
  'Kegalle': ['Kegalle','Mawanella','Rambukkana','Warakapola'],
  'Trincomalee': ['Trincomalee','Kinniya','Mutur','Kantalai'],
  'Batticaloa': ['Batticaloa','Eravur','Kattankudy','Valaichchenai'],
  'Ampara': ['Ampara','Kalmunai','Addalachchenai','Sainthamaruthu','Akkaraipattu']
};
var allDistricts = Object.keys(districtCities);

function updateCityDropdown(districtSelectId, citySelectId, selectedCity) {
  var district = document.getElementById(districtSelectId).value;
  var citySelect = document.getElementById(citySelectId);
  citySelect.innerHTML = '';
  citySelect.appendChild(new Option('Select your city', ''));
  if (district && districtCities[district]) {
    districtCities[district].forEach(function(c) {
      var opt = new Option(c, c);
      if (c === selectedCity) opt.selected = true;
      citySelect.appendChild(opt);
    });
    citySelect.disabled = false;
  } else {
    citySelect.disabled = true;
  }
}