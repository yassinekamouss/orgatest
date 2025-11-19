import { useState, useMemo } from 'react';
import { QueryBuilder, ValueEditor } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.scss';

const fields = [
    {
        name: 'type_applicant',
        label: "Type d'applicant",
        values: [
            { name: 'physique', label: 'Personne Physique' },
            { name: 'morale', label: 'Personne Morale' }
        ],
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
        values: [
            { name: 'Tanger', label: 'Tanger-Tétouan-Al Hoceïma' },
            { name: 'Casa', label: 'Casablanca-Settat' },
            { name: 'Rabat', label: 'Rabat-Salé-Kénitra' },
            { name: 'Fes', label: 'Fès-Meknès' }
        ],
        valueEditorType: (operator) => (operator === 'in' || operator === 'notIn') ? 'multiselect' : 'select'
    },
    { name: 'chiffre_affaires', label: "Chiffre d'affaires", inputType: 'number' },
    { name: 'annee_creation', label: 'Année de création', inputType: 'number' },
];

const evaluateRule = (rule, profile) => {
  const profileValue = profile[rule.field];
  const ruleValue = rule.value;

  if (profileValue === undefined || profileValue === null) {
      return false;
  }

  let processedProfileValue = profileValue;
  let processedRuleValue = ruleValue;

  if (typeof ruleValue === 'number' && typeof profileValue === 'string') {
    processedProfileValue = parseFloat(profileValue);
  } else if (typeof ruleValue === 'string' && typeof profileValue === 'number') {
    processedRuleValue = String(ruleValue);
  }

  switch (rule.operator) {
    case '=':
      return processedProfileValue == processedRuleValue;
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
    case 'in':
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
      if ('combinator' in rule) {
        return evaluateRuleGroup(rule, profile);
      } else {
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
  return false;
};

const BetweenInput = ({ value, handleOnChange }) => {
  const [min, max] = value ? value.split(',') : ['', ''];

  const changeMin = (e) => {
    const newMin = e.target.value;
    handleOnChange(`${newMin},${max || ''}`);
  };

  const changeMax = (e) => {
    const newMax = e.target.value;
    handleOnChange(`${min || ''},${newMax}`);
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

function App() {
  const [query, setQuery] = useState({ combinator: 'and', rules: [] });

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

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
  };

  const handleProfileChange = (e) => {
    const { name, value, type } = e.target;
    setApplicantProfile(prevProfile => ({
      ...prevProfile,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const isEligible = useMemo(() => {
    if (query.rules.length === 0) {
      return false;
    }
    return evaluateRuleGroup(query, applicantProfile);
  }, [query, applicantProfile]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Moteur d'Éligibilité aux Subventions (Maroc)</h1>

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
            { name: 'notIn', label: "n'est pas dans" },
            { name: 'between', label: 'est entre' },
          ]}
          controlElements={{
            valueEditor: (props) => {
              if (props.operator === 'between') {
                return <BetweenInput value={props.value} handleOnChange={props.handleOnChange} />;
              }
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

      <section style={{ border: '1px solid #aaddaa', padding: '20px', borderRadius: '8px', backgroundColor: '#e9ffe9' }}>
        <h2>2. Simuler un profil d'applicant et tester l'éligibilité</h2>
        <p>Modifiez les informations du profil ci-dessous pour voir si l'applicant est éligible selon les règles définies.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          {fields.map(field => (
            <div key={field.name} style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor={field.name} style={{ marginBottom: '5px', fontWeight: 'bold' }}>{field.label}</label>
              {field.values ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={applicantProfile[field.name] || ''}
                  onChange={handleProfileChange}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Sélectionner...</option>
                  {field.values.map(val => (
                    <option key={val.name} value={val.name}>{val.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.inputType || 'text'}
                  id={field.name}
                  name={field.name}
                  value={applicantProfile[field.name] || ''}
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
          {isEligible ? 'Éligible au programme !' : 'Non éligible au programme.'}
        </div>
      </section>
    </div>
  );
}

export deflt App; // Export the App component as default