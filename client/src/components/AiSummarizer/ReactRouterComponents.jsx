/**
 * ReactRouterComponents.jsx
 * 
 * Lightweight React Router implementation providing standard declarative and programmatic routing:
 * - BrowserRouter & MemoryRouter
 * - Routes & Route
 * - Link (declarative SPA navigation without full page refresh)
 * - useParams (extracts dynamic URL parameters like :accountId)
 * - useNavigate (programmatic navigation and history traversal)
 * - useLocation (current pathname inspection)
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export const RouterContext = createContext({
  currentPath: '/',
  navigate: () => {},
  params: {},
});

/**
 * Parses path patterns like "/accounts/:accountId" against "/accounts/acc-1"
 */
export function matchPath(pattern, pathname) {
  if (pattern === '*' || pattern === '') {
    return { matches: true, params: {} };
  }

  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }

  const params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const pSeg = patternSegments[i];
    const aSeg = pathSegments[i];

    if (pSeg.startsWith(':')) {
      const paramName = pSeg.slice(1);
      params[paramName] = aSeg;
    } else if (pSeg !== aSeg) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}

/**
 * BrowserRouter Component
 * Uses window.history if available, or in-memory state.
 */
export function BrowserRouter({ children, initialPath = '/accounts' }) {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined' && window.location && window.location.pathname) {
      return window.location.pathname === '/' ? initialPath : window.location.pathname;
    }
    return initialPath;
  });
  const [params, setParams] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(to);
  };

  const contextValue = useMemo(() => ({
    currentPath,
    navigate,
    params,
    setParams,
  }), [currentPath, params]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

/**
 * MemoryRouter Component for isolated testing and embedded sub-routing
 */
export function MemoryRouter({ children, initialEntries = ['/accounts'], initialIndex = 0 }) {
  const [entries, setEntries] = useState(initialEntries);
  const [index, setIndex] = useState(initialIndex);
  const [params, setParams] = useState({});

  const currentPath = entries[index] || '/';

  const navigate = (to) => {
    const nextEntries = [...entries.slice(0, index + 1), to];
    setEntries(nextEntries);
    setIndex(nextEntries.length - 1);
  };

  const contextValue = useMemo(() => ({
    currentPath,
    navigate,
    params,
    setParams,
  }), [currentPath, params, entries, index]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

/**
 * Routes Component
 * Evaluates its Route children against currentPath and matches the best route.
 */
export function Routes({ children }) {
  const { currentPath, setParams } = useContext(RouterContext);

  let matchedElement = null;
  let matchedParams = {};

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || matchedElement) return;

    const { path, element } = child.props;
    const match = matchPath(path, currentPath);

    if (match.matches) {
      matchedElement = element;
      matchedParams = match.params;
    }
  });

  useEffect(() => {
    if (setParams) {
      setParams(matchedParams);
    }
  }, [JSON.stringify(matchedParams)]);

  return matchedElement || (
    <div className="route-not-found" data-testid="route-not-found">
      <h4>404 - Page Not Found</h4>
      <p>The route <code>{currentPath}</code> does not exist.</p>
    </div>
  );
}

/**
 * Route Component
 */
export function Route({ path, element }) {
  return element;
}

/**
 * Link Component
 * Renders an anchor tag that triggers client-side navigation without full-page refresh.
 */
export function Link({ to, children, className = '', ...rest }) {
  const { navigate } = useContext(RouterContext);

  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} className={`react-router-link ${className}`} {...rest}>
      {children}
    </a>
  );
}

/**
 * useParams Hook
 * Extracts dynamic URL parameters such as accountId from /accounts/:accountId
 */
export function useParams() {
  const { params } = useContext(RouterContext);
  return params || {};
}

/**
 * useNavigate Hook
 * Returns navigation function for programmatic redirection
 */
export function useNavigate() {
  const { navigate } = useContext(RouterContext);
  return navigate;
}

/**
 * useLocation Hook
 * Returns current location state
 */
export function useLocation() {
  const { currentPath } = useContext(RouterContext);
  return { pathname: currentPath };
}

export default {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useLocation,
  matchPath,
};
