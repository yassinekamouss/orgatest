import React, { useState, useMemo } from 'react';
import { QueryBuilder, Rule, RuleGroup, ValueEditor } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.scss'; // ou .css si vous préférez

// --- 1. Définition des champs possibles pour les règles ---
const fields = [
  {
    name: 'type_applicant',
    label: "Type d'applicant",
    // 1. Définir les valeurs sous forme d'objets { name, label }
    values: [
      { name: 'physique', label: 'Personne Physique' },
      { name: 'morale', label: 'Personne Morale' }
    ],
    // 2. Logique dynamique : Si "in", alors multiselect, sinon select simple
    valueEditorType: (operator) => 
      (operator === 'in' || operator === 'notIn') ? 'multiselect' : 'select'
  },
  { 
    name: 'sexe', 
    label: 'Sexe', 
    values: [{ name: 'Homme', label: 'Homme' }, { name: 'Femme', label: 'Femme' }],
    valueEditorType: (operator) => (operator === 'in' || operator === 'notIn') ? 'multiselect' : 'select'
  },
  { 
    name: 'region', 
    label: 'Région', 
    // Pour que "est dans" fonctionne, il faut fournir la liste des régions ici !
    values: [
      { name: 'Tanger', label: 'Tanger-Tétouan-Al Hoceïma' },
      { name: 'Casa', label: 'Casablanca-Settat' },
      { name: 'Rabat', label: 'Rabat-Salé-Kénitra' },
      { name: 'Fes', label: 'Fès-Meknès' },
      // ... autres régions
    ],
    valueEditorType: (operator) => (operator === 'in' || operator === 'notIn') ? 'multiselect' : 'select'
  },
  // ... les autres champs numériques (chiffre d'affaires, etc.) restent inchangés
  { name: 'chiffre_affaires', label: "Chiffre d'affaires", inputType: 'number' },
  { name: 'annee_creation', label: 'Année de création', inputType: 'number' },
];

// --- 2. Fonctions utilitaires pour l'évaluation des règles ---
// Cette partie simule le "Moteur de Règles" du backend
const evaluateRule = (rule, profile) => {
  const profileValue = profile[rule.field];
  const ruleValue = rule.value;

  // Gérer les cas où la valeur du profil est undefined/null
  if (profileValue === undefined || profileValue === null) {
      // Une règle ne peut être vraie si la valeur du profil n'existe pas,
      // sauf si l'opérateur est 'does not exist' ou similaire (que nous n'avons pas ici)
      return false;
  }

  // Conversion des types pour la comparaison
  let processedProfileValue = profileValue;
  let processedRuleValue = ruleValue;

  if (typeof ruleValue === 'number' && typeof profileValue === 'string') {
    processedProfileValue = parseFloat(profileValue);
  } else if (typeof ruleValue === 'string' && typeof profileValue === 'number') {
    processedRuleValue = String(ruleValue);
  }


  switch (rule.operator) {
    case '=':
      return processedProfileValue == processedRuleValue; // Utilisez == pour la conversion de type implicite si nécessaire
    case '!=':
      return processedProfileValue != processedRuleValue;
    case '<':
      return processedProfileValue < processedRuleValue;
    case '<=':
      return processedProfileValue <= processedRuleValue;
    case '>':
      return processedProfileValue > processedRuleValue;
    case '>=':
      return processedProfileValue >= processedRuleValue;
    case 'contains':
      return String(processedProfileValue).includes(String(processedRuleValue));
    case 'doesNotContain':
      return !String(processedProfileValue).includes(String(processedRuleValue));
    case 'startsWith':
      return String(processedProfileValue).startsWith(String(processedRuleValue));
    case 'endsWith':
      return String(processedProfileValue).endsWith(String(processedRuleValue));
    // react-querybuilder peut générer 'in' et 'notIn' si le champ est de type select multiple
    case 'in':
        // ruleValue est supposé être un tableau pour 'in'
        return Array.isArray(ruleValue) && ruleValue.includes(processedProfileValue);
    case 'notIn':
        return Array.isArray(ruleValue) && !ruleValue.includes(processedProfileValue);
    default:
      console.warn(`Opérateur inconnu : ${rule.operator}`);
      return false;
  }
};

const evaluateRuleGroup = (ruleGroup, profile) => {
  const { combinator, rules } = ruleGroup;

  if (combinator === 'and') {
    return rules.every(rule => {
      if ('combinator' in rule) { // C'est un sous-groupe
        return evaluateRuleGroup(rule, profile);
      } else { // C'est une règle simple
        return evaluateRule(rule, profile);
      }
    });
  } else if (combinator === 'or') {
    return rules.some(rule => {
      if ('combinator' in rule) {
        return evaluateRuleGroup(rule, profile);
      } else {
        return evaluateRule(rule, profile);
      }
    });
  }
  return false; // Should not happen
};



// Ajoutez ce composant avant votre fonction App
const BetweenInput = ({ value, handleOnChange }) => {
  // On sépare la valeur actuelle (ex: "1000,5000") en deux variables
  // Si value est vide, on initialise avec deux chaines vides
  const [min, max] = value ? value.split(',') : ['', ''];

  const changeMin = (e) => {
    const newMin = e.target.value;
    handleOnChange(`${newMin},${max || ''}`); // On reconstitue la string "min,max"
  };

  const changeMax = (e) => {
    const newMax = e.target.value;
    handleOnChange(`${min || ''},${newMax}`); // On reconstitue la string "min,max"
  };

  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      <input 
        type="number" 
        value={min} 
        onChange={changeMin} 
        placeholder="Min" 
        style={{ width: '80px', padding: '4px' }} 
      />
      <span>et</span>
      <input 
        type="number" 
        value={max} 
        onChange={changeMax} 
        placeholder="Max" 
        style={{ width: '80px', padding: '4px' }}
      />
    </div>
  );
};


// --- Composant Principal de l'Application ---
function App() {
  // État pour les règles du programme (ce que l'admin construit)
  const [query, setQuery] = useState({ combinator: 'and', rules: [] });

  // État pour le profil de l'applicant à tester
  const [applicantProfile, setApplicantProfile] = useState({
    type_applicant: 'physique',
    sexe: 'Homme',
    chiffre_affaires: 0,
    secteur_activite: '',
    statut_juridique: '',
    montant_investissement: 0,
    region: '',
    annee_creation: 2023,
  });

  // Gère les changements dans le Query Builder
  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
  };

  // Gère les changements dans le formulaire du profil applicant
  const handleProfileChange = (e) => {
    const { name, value, type } = e.target;
    setApplicantProfile(prevProfile => ({
      ...prevProfile,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  // Évalue l'éligibilité basée sur les règles et le profil actuel
  const isEligible = useMemo(() => {
    if (query.rules.length === 0) {
      return false; // Pas de règles définies, donc non éligible par défaut
    }
    return evaluateRuleGroup(query, applicantProfile);
  }, [query, applicantProfile]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Moteur d'Éligibilité aux Subventions (Maroc)</h1>

      {/* Section Administrateur : Définition des règles */}
      <section style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2>1. Définir les critères d'éligibilité (Admin)</h2>
        <p>Utilisez l'interface ci-dessous pour construire les règles d'éligibilité du programme. Vous pouvez ajouter des conditions ("Règle") et les combiner avec des "ET" ou des "OU".</p>
        <QueryBuilder
          fields={fields}
          query={query}
          onQueryChange={handleQueryChange}
          operators={[
            { name: '=', label: '=' },
            { name: '!=', label: '!=' },
            { name: '<', label: '<' },
            { name: '<=', label: '<=' },
            { name: '>', label: '>' },
            { name: '>=', label: '>=' },
            { name: 'contains', label: 'contient' },
            { name: 'doesNotContain', label: 'ne contient pas' },
            { name: 'startsWith', label: 'commence par' },
            { name: 'endsWith', label: 'finit par' },
            { name: 'in', label: 'est dans' },
            { name: 'notIn', label: 'n\'est pas dans' },
            { name: 'between', label: 'est entre' },
          ]}

          controlElements={{
            valueEditor: (props) => {
              // Si l'opérateur choisi est 'between', on affiche notre double input
              if (props.operator === 'between') {
                return <BetweenInput value={props.value} handleOnChange={props.handleOnChange} />;
              }
              // Sinon, on laisse le QueryBuilder gérer (select, input simple, etc.)
              // Note: On doit importer ValueEditor de la librairie si on veut le rendre manuellement, 
              // mais le plus simple est de retourner null pour laisser le défaut, 
              // SAUF que react-querybuilder demande de retourner le composant par défaut.
              // ASTUCE SIMPLE : Utiliser la prop 'renderValueEditor' n'existe pas directement comme ça.
              
              // LA BONNE MÉTHODE avec la librairie standard :
              // Il faut importer 'ValueEditor' de 'react-querybuilder' au début du fichier
              return <ValueEditor {...props} />; 
            }
          }}

          translations={{
            addRule: 'Ajouter une Règle',
            addGroup: 'Ajouter un Groupe',
            removeGroup: 'Supprimer ce Groupe',
            removeRule: 'Supprimer cette Règle',
            combinators: {
              and: 'ET',
              or: 'OU',
            },
          }}
        />

        <h3 style={{ marginTop: '20px' }}>Règles au format JSON (ce qui serait sauvegardé en BDD) :</h3>
        <pre style={{ backgroundColor: '#eee', padding: '15px', borderRadius: '5px', overflowX: 'auto' }}>
          <code>{JSON.stringify(query, null, 2)}</code>
        </pre>
      </section>

      {/* Section Utilisateur : Simulation du profil et test */}
      <section style={{ border: '1px solid #aaddaa', padding: '20px', borderRadius: '8px', backgroundColor: '#e9ffe9' }}>
        <h2>2. Simuler un profil d'applicant et tester l'éligibilité</h2>
        <p>Modifiez les informations du profil ci-dessous pour voir si l'applicant est éligible selon les règles définies.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          {fields.map(field => (
            <div key={field.name} style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor={field.name} style={{ marginBottom: '5px', fontWeight: 'bold' }}>{field.label}</label>
              {field.inputType === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={applicantProfile[field.name]}
                  onChange={handleProfileChange}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {field.values.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.inputType}
                  id={field.name}
                  name={field.name}
                  value={applicantProfile[field.name]}
                  onChange={handleProfileChange}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              )}
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: '30px' }}>Résultat de l'éligibilité :</h3>
        <div style={{
          padding: '15px',
          borderRadius: '5px',
          fontWeight: 'bold',
          fontSize: '1.2em',
          backgroundColor: isEligible ? '#d4edda' : '#f8d7da',
          color: isEligible ? '#155724' : '#721c24',
          border: isEligible ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
        }}>
          {isEligible ? '✅ Éligible au programme !' : '❌ Non éligible au programme.'}
        </div>
      </section>
    </div>
  );
}

export default App;