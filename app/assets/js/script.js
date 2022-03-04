$(function () {
    var strawberryPage = $('.strawberry');

    var strawberryData;

    // Populate strawberry data and initialize page with hash change
    $.getJSON('data.json', function (data) {
        strawberryData = data[0];

        $(window).trigger('hashchange');
    });

    strawberryPage.on('click', function (e) {
        createXMLRequest();
        if (strawberryPage.hasClass('visible')) {
            var clicked = $(e.target);

            // Return to main page
            if (clicked.hasClass('close')) {
                createXMLRequest();
                window.location.hash = '#';
            }
        }
    });

    // Render on hash change
    $(window).on('hashchange', function () {
        render(decodeURI(window.location.hash));
    });

    function render(url) {
        // Get the keyword
        var keyword = url.split('/')[0];

        // Hide whatever page is currently shown.
        $('.main-content .page').removeClass('visible');

        if (keyword == '#strawberries') {
            renderStrawberryPage();
        } else {
            renderBasePage();
        }
    }

    function renderBasePage() {
        var page = $('.base');
        page.addClass('visible');
    }

    function renderStrawberryPage() {
        var page = $('.strawberry');
        var container = $('.strawberry-large');
        container.find('img').attr('src', strawberryData.image.large);
        container.find('p').text(strawberryData.description);

        page.addClass('visible');
        // Making four AJAX requests using XMLHttpRequests
        // These are occuring after route change is detected
        createXMLRequest();
        createXMLRequest();
        createXMLRequest();
        createXMLRequest();
    }

    // Dummy AJAX Request
    function createXMLRequest() {
        var xhr = new XMLHttpRequest((async = true));
        var url =
            'https://dataplane.rum.us-west-2.amazonaws.com/appmonitors/abc123/';
        xhr.open('GET', url, true);
        xhr.send();
    }
});
