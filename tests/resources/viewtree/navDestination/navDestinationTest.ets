@Entry
@Component
struct navDestinationTest {
  @Provide stack: NavPathStack = new NavPathStack()
  @Provide homePageTransitionType: NavigationSystemTransitionType = NavigationSystemTransitionType.DEFAULT;


  @Builder
  pageMap(name: string) {
    if (name === 'Fade') {
      Fade();
    } else if (name === 'Explode') {
      Explode();
    }
  }


  aboutToAppear(): void {
    this.stack.pushPath({name: 'Dest'});
  }


  build() {
    Navigation(this.stack) {
      // empty
    }
    .navDestination(this.pageMap)
    .hideNavBar(true)
  }
}


@Component
struct Dest {
  @Consume stack: NavPathStack;
  @Consume homePageTransitionType: NavigationSystemTransitionType;
  @State name: string = 'NA';


  build() {
    Stack();
  }
}


@Component
struct Fade {
  @Consume stack: NavPathStack;
  @State name: string = 'NA';


  build() {
    Column();
  }
}


@Component
struct Explode {
  @Consume stack: NavPathStack;
  @State name: string = 'NA';


  build() {
    Row();
  }
}


@Component
struct SlideRight {
  @Consume stack: NavPathStack;
  @State name: string = 'NA';


  build() {
    Button();
  }
}


@Component
struct SlideBottom {
  @Consume stack: NavPathStack;
  @State name: string = 'NA';


  build() {
    Search();
  }
}

