import { useLocalStorage } from './useLocalStorage';

export const useProviders = () => {
    const [providers, setProviders] = useLocalStorage('healthTracker_providers', []);
  
    const addProvider = (providerData) => {
        setProviders(prev => [providerData, ...prev]);
    };

    return { providers, addProvider };
};