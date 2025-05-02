import React from 'react'
import UserContext from './UserContext'

const UserContextProvider = ({children}) => {
    const [user, setUser] = React.useState(null);

    // Add debugging for user state changes
    React.useEffect(() => {
        // console.log('User state changed:', user);
    }, [user]);

    // Wrap setUser to add debugging
    const handleSetUser = (newUser) => {
        // console.log('Setting new user:', newUser);
        setUser(newUser);
    };

    return (
        <UserContext.Provider value={{user, setUser: handleSetUser}}>
            {children}
        </UserContext.Provider>
    )
}

export default UserContextProvider
