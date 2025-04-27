// Liste des étages
const etages = ["RDC", "1er", "2e", "3e", "4e", "5e", "6e", "7e"];

// Fonction pour créer un étage
function creerEtage(nomEtage) {
  const immeuble = document.getElementById('immeuble');
  immeuble.innerHTML = ""; // Vider avant de recréer

  // Ajouter couloir avec escalier + ascenseur
  const couloir = document.createElement('div');
  couloir.className = 'couloir';

  const escalier = document.createElement('div');
  escalier.className = 'escalier';
  escalier.innerText = 'Esc';

  const ascenseur = document.createElement('div');
  ascenseur.className = 'ascenseur';
  ascenseur.innerText = 'Asc';

  couloir.appendChild(escalier);
  couloir.appendChild(ascenseur);

  immeuble.appendChild(couloir);

  // Ajouter une ligne de bureaux alignés (48m de longueur)
  // Supposons 12 bureaux alignés (chaque bureau fait environ 4m de large dans cette logique)
  for (let i = 0; i < 12; i++) {
    const bureau = document.createElement('div');
    bureau.className = 'bureau';
    bureau.innerText = `Bureau ${i + 1}`;
    immeuble.appendChild(bureau);
  }
}

// Générer les boutons d'étages
function genererBoutonsEtages() {
  const container = document.getElementById('etages-buttons');

  etages.forEach(etage => {
    const btn = document.createElement('button');
    btn.innerText = etage;
    btn.onclick = () => creerEtage(etage);
    container.appendChild(btn);
  });
}

// Initialisation
genererBoutonsEtages();
creerEtage("RDC"); // Charger RDC au début
