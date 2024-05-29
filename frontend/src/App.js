import React from 'react';
import { Container } from 'react-bootstrap';
import { BrowserRouter as Router, Route } from 'react-router-dom'; 


import Header from './components/Header';
import Footer from './components/Footer';

import HomeScreen from './screens/HomeScreen';
import ModelScreen from './screens/ModelScreen';
import AboutScreen from './screens/AboutScreen';



const App = () => {
    return(
        <Router>
            <Header />   
            <main className='py-3'>
                <Container>
                    <Route path='/' component={HomeScreen} exact/>
                    <Route path='/model/:id' component={ModelScreen} />
                    <Route path='/about' component={AboutScreen} />
                </Container>
            </main>
            <Footer/> 
        </Router>
    );
}
export default App;