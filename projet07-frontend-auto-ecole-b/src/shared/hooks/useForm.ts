// Hook personnalisé pour la gestion des formulaires
import { useState, useCallback, useRef } from 'react';
import { FormValidator, ValidationResult } from '../utils/validators';

// Interface pour l'état du formulaire
export interface FormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Hook pour la gestion des formulaires
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validator?: FormValidator
) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {} as Record<keyof T, string>,
    touched: {} as Record<keyof T, boolean>,
    isValid: true,
    isSubmitting: false,
  });

  const validatorRef = useRef(validator);

  // Fonction pour mettre à jour une valeur
  const setValue = useCallback((field: keyof T, value: any) => {
    setState(prev => {
      const newValues = { ...prev.values, [field]: value };
      const newErrors = { ...prev.errors };
      delete newErrors[field];

      // Validation en temps réel si le champ a été touché
      if (prev.touched[field] && validatorRef.current) {
        const validation = validatorRef.current.validate({ [field]: value });
        if (!validation.isValid) {
          newErrors[field] = validation.errors[field as string] || '';
        }
      }

      return {
        ...prev,
        values: newValues,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  // Fonction pour marquer un champ comme touché
  const setTouched = useCallback((field: keyof T) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  // Fonction pour valider un champ spécifique
  const validateField = useCallback((field: keyof T) => {
    if (!validatorRef.current) return;

    const validation = validatorRef.current.validate({ [field]: state.values[field] });
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: validation.errors[field as string] || '',
      },
      isValid: Object.keys(prev.errors).length === 0,
    }));
  }, [state.values]);

  // Fonction pour valider tout le formulaire
  const validateForm = useCallback((): ValidationResult => {
    if (!validatorRef.current) {
      return { isValid: true, errors: {} };
    }

    const validation = validatorRef.current.validate(state.values);
    setState(prev => ({
      ...prev,
      errors: validation.errors as Record<keyof T, string>,
      isValid: validation.isValid,
    }));

    return validation;
  }, [state.values]);

  // Fonction pour réinitialiser le formulaire
  const resetForm = useCallback((newValues?: T) => {
    setState({
      values: newValues || initialValues,
      errors: {} as Record<keyof T, string>,
      touched: {} as Record<keyof T, boolean>,
      isValid: true,
      isSubmitting: false,
    });
  }, [initialValues]);

  // Fonction pour soumettre le formulaire
  const submitForm = useCallback(async (
    onSubmit: (values: T) => Promise<void> | void
  ) => {
    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Marquer tous les champs comme touchés
      const allTouched = Object.keys(state.values).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Record<keyof T, boolean>);

      setState(prev => ({ ...prev, touched: allTouched }));

      // Valider le formulaire
      const validation = validateForm();
      if (!validation.isValid) {
        setState(prev => ({ ...prev, isSubmitting: false }));
        return;
      }

      // Soumettre le formulaire
      await onSubmit(state.values);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [state.values, validateForm]);

  // Fonction pour obtenir l'erreur d'un champ
  const getFieldError = useCallback((field: keyof T): string => {
    return state.errors[field] || '';
  }, [state.errors]);

  // Fonction pour vérifier si un champ a une erreur
  const hasFieldError = useCallback((field: keyof T): boolean => {
    return !!state.errors[field];
  }, [state.errors]);

  // Fonction pour vérifier si un champ a été touché
  const isFieldTouched = useCallback((field: keyof T): boolean => {
    return !!state.touched[field];
  }, [state.touched]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    setValue,
    setTouched,
    validateField,
    validateForm,
    resetForm,
    submitForm,
    getFieldError,
    hasFieldError,
    isFieldTouched,
  };
}






