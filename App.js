/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import { Platform, StyleSheet, ScrollView, Text, View, TouchableOpacity } from 'react-native';

import ApolloClient, { gql } from "apollo-boost";
import { persistCache } from "apollo-cache-persist";
import { InMemoryCache } from "apollo-cache-inmemory";
import { Hermes } from 'apollo-cache-hermes';
import AndroidFileStorage from "./storage/AndroidFileStorage";
import { ApolloProvider } from "react-apollo";
// or you can use `import gql from 'graphql-tag';` instead

// if (process.env.NODE_ENV !== 'production') {
//   const {whyDidYouUpdate} = require('why-did-you-update');
//   whyDidYouUpdate(React, { exclude: [/\bYellowBoxListRow\b/, /\bTouchableText\b/, /\bYellowBox\b/, /\bYellowBoxList\b/, /\bCellRenderer\b/, /\bYellowBoxPressable\b/, /\bTouchableWithoutFeedback\b/, /\bYellowBoxButton\b/] });
// }

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

const scheduledVerifierTaskFragment = gql`
  fragment ScheduledVerifierTaskFields on ScheduledVerifierTask {
    id
    verifier {
      id
    }
    finishedTask
    allowedStartStamp
    lateStartStamp
    startStamp
    task {
      id
    }
  }
`,

taskFragment = gql`
  fragment TaskFields on Task {
    id
    version
    taskTemplate {
      id
      version
      name
      attributes {
        id
        version
        sequence
        attribute {
          id
          status
          version
          name
          imageId
          required
          prefix
          suffix
          options
          type
        }
      }
    }
    workGroup {
      id
      version
      name
    }
  }
`,

verifierFragment = gql `
  fragment VerifierFields on Verifier {
    id
    version
    name
    tagId
    tasks {
      id
      version
      status
      task {
        id
        version
        strictMode
        status
        workGroup {
          id
          version
        }
        taskTemplate {
          id
          version
          name
          status
          attributes {
            id
            version
            sequence
            attribute {
              id
              status
              version
              name
              imageId
              required
              prefix
              suffix
              options
              type
            }
          }
        }
      }
    }
  }
`;

const getOfflineDataByDeviceQuery = gql`
  query($businessDevice: BusinessDeviceInput) {
    getOfflineDataByDevice(businessDevice: $businessDevice) {
      tasks {
        ...TaskFields
      }
      verifiers {
        ...VerifierFields
      }
      reminders {
        identifier
        stamp
        taskStartStamp
        task {
          id
        }
        verifiers {
          id
        }
      }
      scheduledVerifierTasks {
        ...ScheduledVerifierTaskFields
      }
    }
  }
  ${scheduledVerifierTaskFragment}
  ${taskFragment}
  ${verifierFragment}
`;
const cache = new InMemoryCache();
// const cache = new Hermes();
let client;
let token;
const login = () => {
  const request = new Request(`http://192.168.0.143:8063/login`, {
    method: "POST",
    mode: "cors",
    body: `userId=ctumbaco@vinsotel.com&password=96dfd0a6-308e-4de0-8004-158343263824&remember-me=false`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    // Needed to save session cookie
    credentials: "include"
  });

  // Send the request to the server
  fetch(request)
    .then(response => {
      response.json().then(data => {
        if (response.ok) {
          // Authentication was successful

          token = data.token;
          console.info('Authentication OK', data)

          client = new ApolloClient({
            uri: "http://192.168.0.143:8063/graphql",
            cache,
            credentials: "include",
            fetch: (uri, options) => {
              const newOptions = options;

              if (data.token) {
                /**
                 * Add our local CSRF token to the request if there is one
                 *
                 * This is VERY important to have because it handles session time outs.
                 */
                newOptions.headers["X-CSRF-TOKEN"] = data.token;
              }

              return fetch(uri, newOptions);
            }
          });

          // User is now authenticated
          // setConnectionInfo({
          //   authenticated: true
          // });
        } else {
          // Authentication failed

          console.info('Authentication Failed')
          // Show the user the error message, used to avoid re-rendering in Final Form because using the callback with Toast causes an error
          // if (showMessage) {
          //   showMessage(data);
          // }
          //
          // // Perform the callback for setting the whole form error in Final Form
          // if (callback) {
          //   callback({ [FORM_ERROR]: data });
          // }
        }
      });
    })
    .catch(error => {
      console.info('error login', error.networkError)
      // showMessage({
      //   success: false,
      //   ...messages.noConnectionAvailable
      // });
    });

  return null;
};

const doLogout = (token) => {
  const request = new Request(`http://192.168.0.143:8063/logout`, {
    method: "POST",
    headers: {
      "X-CSRF-TOKEN": token
    },
    // Needed to delete session cookie
    credentials: "include"
  });

  // Send the request to the server
  fetch(request).then(
    response => {
      if (response.ok) {
        response.json().then(
          // Server replied with a new token so we have to resend our request. This happens if the user leaves the window open, session expires and then presses logout
          data => {

            console.info('logout OK', data)
            return doLogout(data.token)
          },
          // There is no new token so we were successfully logged out
          () => console.info('logout OK 2')
        );
      } else {
        // client.resetStore();
        console.info('logout not OK')
      }
    },

    // Error happens when the session expired, so we don't need to retry we simply reset the Apollo cache
    err => {
      console.info('error logout', err)
    }
  );
};

type Props = {};
export default class App extends Component<Props> {
  state = {
    svt: null
  }

  // async componentDidMount() {
  //
  //   await persistCache({
  //     cache,
  //     storage: AndroidFileStorage,
  //     debounce: 1000,
  //     maxSize: false,
  //     debug: true
  //   });
  //
  //   this.setState({
  //     // client,
  //     loaded: true
  //   });
  // }

  render() {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
      >
        <View style={styles.container}>
          <Text style={styles.welcome}>Welcome to React Native!</Text>
          <Text style={styles.instructions}>To get started, edit App.js</Text>
          <Text style={styles.instructions}>{instructions}</Text>
        </View>

        <View style={styles.titleContainer}>
          <TouchableOpacity
            onPress={() => {
              login()
            }}
          >
            <Text style={styles.sectionTitle}>LOGIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              doLogout(token)
            }}
          >
            <Text style={styles.sectionTitle}>LOGOUT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <TouchableOpacity
            onPress={() => {
              const businessDevice = {
                alias: "VReader1 Marcor3",
                id: "3e383987-cad6-44ba-9c5b-b008e6e9d2fa",
                locked: false,
                loginType: "fastLogin",
                version: 176,
                // __typename: "BusinessDevice"
              }
              console.info('client', client, businessDevice)
              // client
              //   .query({
              //     query: getOfflineDataByDeviceQuery,
              //     variables: { businessDevice },
              //     fetchPolicy: "cache-and-network",
              //     notifyOnNetworkStatusChange: true
              //   })
              //   .then(result => {
              //     console.log('res', result, result.data, result.data.getOfflineDataByDevice)
              //     this.setState({svt: result.data.getOfflineDataByDevice.scheduledVerifierTasks})
              //   })
              //   .catch(err => console.log('error Request', err.graphQLErrors))

              client.watchQuery({
                query: getOfflineDataByDeviceQuery,
                variables: { businessDevice },
                fetchPolicy: "cache-and-network"
              }).subscribe({
                next: data => {
                  console.info('data watch', data)
                  if (data.data)
                  this.setState({
                    svt: data.data.getOfflineDataByDevice.scheduledVerifierTasks,
                    networkStatus: data.networkStatus
                  })
                },
                error: err => {
                  console.info('err', err)
                  this.setState({dataError: err})
                },
                complete: comp => {
                  console.info('complete', comp)
                  this.setState({dataComp: comp})
                }
              }/*({data}) => {
                console.info('data from query', data)
              });/*.then(data => {
                console.info('data from query', data)
              })*/)
            }}
          >
            <Text style={styles.sectionTitle}>QUERY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <TouchableOpacity
            onPress={() => {
              client.reFetchObservableQueries()
                .then(data => {
                  console.info('data refetch', data)
                })
                .catch(err => {
                  console.info('err refetch', err)
                })
            }}
          >
            <Text style={styles.sectionTitle}>REFETCH</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text>{this.state.networkStatus}</Text>
          <Text>{this.state.svt && this.state.svt[0].startStamp}</Text>
          {console.info(this.state.svt && new Date(this.state.svt[0].startStamp))}
          {
            this.state.svt ? this.state.svt.map(svt => <Text key={svt.id}>{svt.id}</Text>) : null
          }
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  scrollView: {
    backgroundColor: "white",
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: "white",
  },
  sectionContainer: {
    marginTop: 52,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: "black",
  },
  titleContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: "black",
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: "black",
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});
