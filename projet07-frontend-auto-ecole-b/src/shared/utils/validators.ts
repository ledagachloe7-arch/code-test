// Utilitaires de validation centralisés
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Validations communes
export const validators = {
  // Validation d'email
  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'L\'email est requis';
    if (!emailRegex.test(value)) return 'Format d\'email invalide';
    return null;
  },

  // Validation de mot de passe
  password: (value: string): string | null => {
    if (!value) return 'Le mot de passe est requis';
    if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (!/(?=.*[a-z])/.test(value)) return 'Le mot de passe doit contenir au moins une minuscule';
    if (!/(?=.*[A-Z])/.test(value)) return 'Le mot de passe doit contenir au moins une majuscule';
    if (!/(?=.*\d)/.test(value)) return 'Le mot de passe doit contenir au moins un chiffre';
    return null;
  },

  // Validation de nom
  name: (value: string): string | null => {
    if (!value) return 'Le nom est requis';
    if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères';
    if (value.length > 50) return 'Le nom ne peut pas dépasser 50 caractères';
    return null;
  },

  // Validation de téléphone
  phone: (value: string): string | null => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!value) return 'Le téléphone est requis';
    if (!phoneRegex.test(value)) return 'Format de téléphone invalide';
    return null;
  },

  // Validation de champ requis
  required: (value: any): string | null => {
    if (value === null || value === undefined || value === '') {
      return 'Ce champ est requis';
    }
    return null;
  },

  // Validation de longueur minimale
  minLength: (min: number) => (value: string): string | null => {
    if (value && value.length < min) {
      return `Doit contenir au moins ${min} caractères`;
    }
    return null;
  },

  // Validation de longueur maximale
  maxLength: (max: number) => (value: string): string | null => {
    if (value && value.length > max) {
      return `Ne peut pas dépasser ${max} caractères`;
    }
    return null;
  },
};

// Classe de validation générique
export class FormValidator {
  private rules: Record<string, ValidationRule> = {};

  // Ajouter une règle de validation
  addRule(field: string, rule: ValidationRule): FormValidator {
    this.rules[field] = rule;
    return this;
  }

  // Valider un objet de données
  validate(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];
      const error = this.validateField(value, rule);
      if (error) {
        errors[field] = error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Valider un champ spécifique
  private validateField(value: any, rule: ValidationRule): string | null {
    // Validation requise
    if (rule.required && !value) {
      return 'Ce champ est requis';
    }

    // Si le champ est vide et non requis, pas d'erreur
    if (!value && !rule.required) {
      return null;
    }

    // Validation de longueur minimale
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return `Doit contenir au moins ${rule.minLength} caractères`;
    }

    // Validation de longueur maximale
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return `Ne peut pas dépasser ${rule.maxLength} caractères`;
    }

    // Validation par pattern
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return 'Format invalide';
    }

    // Validation personnalisée
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }
}

// Validateurs spécifiques pour les formulaires
export const formValidators = {
  // Validateur pour le formulaire de connexion
  login: new FormValidator()
    .addRule('email', { required: true, custom: validators.email })
    .addRule('password', { required: true, minLength: 6 }),

  // Validateur pour le formulaire d'opérateur
  operator: new FormValidator()
    .addRule('name', { required: true, custom: validators.name })
    .addRule('email', { required: true, custom: validators.email })
    .addRule('password', { required: true, custom: validators.password }),

  // Validateur pour le formulaire d'auto-école
  autoEcole: new FormValidator()
    .addRule('name', { required: true, custom: validators.name })
    .addRule('email', { required: true, custom: validators.email })
    .addRule('phone', { required: true, custom: validators.phone }),
};






